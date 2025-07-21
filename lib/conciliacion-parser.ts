import * as XLSX from "xlsx"
import type { ResultadoConciliacion, TipoConciliacion } from "./conciliacion-types"

export interface ConciliacionRow {
  [key: string]: string | number | boolean | null
}

// Función para limpiar CUIT (eliminar guiones y espacios)
function limpiarCuit(cuit: string): string {
  return String(cuit || "")
    .replace(/[-\s]/g, "")
    .trim()
}

// Función para convertir fecha de formato "Jul 27 2025 12:00AM" a "27/07/2025"
function convertirFecha(fechaStr: string): string {
  if (!fechaStr) return ""
  try {
    // Si ya está en formato DD/MM/YYYY, devolverla tal como está
    if (fechaStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      return fechaStr
    }
    // Manejar formato "Jul 1 2025 12:00AM" o "Jul  1 2025 12:00AM" (con doble espacio)
    if (typeof fechaStr === "string" && fechaStr.includes(" ")) {
      // Normalizar espacios múltiples a uno solo
      const fechaNormalizada = fechaStr.replace(/\s+/g, " ")
      const partes = fechaNormalizada.split(" ")
      if (partes.length >= 3) {
        const mesStr = partes[0]
        const dia = partes[1].padStart(2, "0") // Asegurar que el día tenga 2 dígitos
        const año = partes[2]
        // Mapear nombres de meses en inglés
        const meses: Record<string, string> = {
          Jan: "01",
          Feb: "02",
          Mar: "03",
          Apr: "04",
          May: "05",
          Jun: "06",
          Jul: "07",
          Aug: "08",
          Sep: "09",
          Oct: "10",
          Nov: "11",
          Dec: "12",
        }
        const mes = meses[mesStr]
        if (mes) {
          return `${dia}/${mes}/${año}`
        }
      }
    }
    // Si es un número de Excel, convertir a fecha
    if (typeof fechaStr === "number") {
      const date = new Date((fechaStr - 25569) * 86400 * 1000)
      return date.toLocaleDateString("es-AR")
    }
    return String(fechaStr)
  } catch (error) {
    console.error("Error convirtiendo fecha:", fechaStr, error)
    return String(fechaStr)
  }
}

// Función para normalizar fecha a formato DD/MM/YYYY
function normalizarFecha(fechaStr: string): string {
  if (!fechaStr) return ""

  try {
    // Si ya está en formato correcto DD/MM/YYYY, devolverla tal como está
    if (fechaStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return fechaStr
    }

    // Si está en formato D/M/YYYY o DD/M/YYYY o D/MM/YYYY, normalizarla
    const partes = fechaStr.split("/")
    if (partes.length === 3) {
      const dia = partes[0].padStart(2, "0")
      const mes = partes[1].padStart(2, "0")
      const año = partes[2]
      return `${dia}/${mes}/${año}`
    }

    return fechaStr
  } catch (error) {
    console.error("Error normalizando fecha:", fechaStr, error)
    return fechaStr
  }
}

// Función para normalizar monedas - CORREGIDA según especificaciones
function normalizarMoneda(monedaStr: string): string {
  if (!monedaStr) return "$"

  const monedaLimpia = String(monedaStr).trim()

  // Mapeo exacto de monedas según especificaciones del usuario
  const mapeoMonedas: Record<string, string> = {
    "Dolar MEP (Local)": "USD",
    "Dolar Cable (Exterior)": "USD C",
    Pesos: "$",
    "USD C": "USD C",
    $: "$",
    "USD D": "USD", // CORREGIDO: USD D se convierte a USD
    USD: "USD",
    ARS: "$", // ARS se convierte a $
  }

  // Buscar coincidencia exacta primero
  if (mapeoMonedas[monedaLimpia]) {
    return mapeoMonedas[monedaLimpia]
  }

  // Buscar coincidencias parciales
  for (const [clave, valor] of Object.entries(mapeoMonedas)) {
    if (monedaLimpia.toLowerCase().includes(clave.toLowerCase())) {
      return valor
    }
  }

  // Si contiene "USD" o "Dolar", devolver USD
  if (monedaLimpia.toLowerCase().includes("usd") || monedaLimpia.toLowerCase().includes("dolar")) {
    return "USD"
  }

  // Si contiene "Peso" o "$", devolver $
  if (monedaLimpia.toLowerCase().includes("peso") || monedaLimpia.includes("$")) {
    return "$"
  }

  // Por defecto, devolver la moneda original o $
  return monedaLimpia || "$"
}

// Función para buscar columna por nombres posibles
function buscarColumna(headers: string[], nombres: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toString().toLowerCase() || ""
    if (nombres.some((nombre) => header.includes(nombre.toLowerCase()))) {
      return i
    }
  }
  return -1
}

// Función para convertir importe
function convertirImporte(importeStr: string): number {
  if (!importeStr) return 0

  // Si es un número, devolverlo directamente
  if (typeof importeStr === "number") {
    return importeStr
  }

  // Convertir a string y limpiar formato de moneda
  const importeLimpio = String(importeStr)
    .replace(/^\$\s*/, "") // Remover $ al inicio
    .replace(/^US\$\s*/, "") // Remover US$ al inicio
    .replace(/[^\d.,-]/g, "") // Remover todo excepto dígitos, puntos, comas y guiones
    .replace(/,/g, "") // Remover todas las comas (separadores de miles)

  return Number.parseFloat(importeLimpio) || 0
}

// Función para extraer CUIT del beneficiario
function extraerCuitBeneficiario(beneficiario: string): string {
  if (!beneficiario) return ""

  // Buscar patrón de CUIT en el beneficiario
  const cuitMatch = beneficiario.match(/(\d{11}|\d{2}-\d{8}-\d{1})/)
  if (cuitMatch) {
    return limpiarCuit(cuitMatch[0])
  }

  return ""
}

// Función para verificar si es impuesto (solo guiones)
function esImpuesto(beneficiario: string): boolean {
  return /^-+$/.test(beneficiario.trim())
}

// Función para verificar si es CUIT de transferencias monetarias - CORREGIDA versión 120
function esCuitTransferencia(cuit: string): boolean {
  return cuit === "30711610126"
}

// Función para verificar si es CUIT de mercado - CORREGIDA versión 120
function esCuitMercado(cuit: string): boolean {
  const cuitsMercado = ["30529177875", "30500001000", "30600000000"]
  return cuitsMercado.includes(cuit)
}

// Función para verificar si es beneficiario de mercado
function esBeneficiarioMercado(beneficiario: string): boolean {
  const palabrasMercado = ["MATBA", "ROFEX", "BYMA", "MAV", "MAE", "DEP. 97 - 30711610126"]
  const beneficiarioUpper = beneficiario.toUpperCase()
  return palabrasMercado.some((palabra) => beneficiarioUpper.includes(palabra))
}

// Función para inferir moneda del nombre del archivo
function inferirMoneda(fileName: string): string {
  const fileNameUpper = fileName.toUpperCase()
  if (fileNameUpper.includes("USD") || fileNameUpper.includes("DOLAR")) {
    return "USD"
  }
  return "$"
}

// Función para parsear Status Órdenes de Pago - ACTUALIZADA con normalización corregida
export async function parseStatusOrdenesPago(
  file: File,
  updateProgress?: (current: number, total: number, message: string) => void,
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        console.log("📊 Status Órdenes - Datos parseados:", jsonData.length)

        const processedData = jsonData.map((row: any, index) => {
          if (updateProgress) {
            updateProgress(index + 1, jsonData.length, `Procesando Status ${index + 1}/${jsonData.length}`)
          }

          // Extraer CUIT del campo "Comitente (CUIT)"
          const cuitRaw = row["Comitente (CUIT)"] || ""
          const cuit = limpiarCuit(cuitRaw)

          // Detectar CCE en la denominación
          const descripcion = row["Comitente (Denominación)"] || ""
          const esCce = descripcion.includes("(CCE)")

          // Convertir fecha usando la función específica
          const fechaRaw = row["Fecha"] || ""
          const fecha = convertirFecha(fechaRaw)
          const fechaNormalizada = normalizarFecha(fecha)

          // CORREGIDO: Normalizar moneda usando la función actualizada
          const monedaRaw = row["Moneda (Descripción)"] || row["Moneda"] || "$"
          const monedaNormalizada = normalizarMoneda(monedaRaw)

          // Debug para verificar normalización
          if (monedaRaw !== monedaNormalizada) {
            console.log(`💱 Status - Moneda normalizada: "${monedaRaw}" -> "${monedaNormalizada}"`)
          }

          return {
            ...row,
            id: `status-${Date.now()}-${index}`,
            origen: "status",
            CUIT: cuit, // Campo normalizado
            Fecha: fechaNormalizada, // Campo normalizado
            Moneda: monedaNormalizada, // Campo normalizado CORREGIDO
            esCce,
            datosOriginales: { ...row },
          }
        })

        resolve(processedData)
      } catch (error) {
        console.error("❌ Error parseando Status:", error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo Status"))
    reader.readAsArrayBuffer(file)
  })
}

// Función para parsear Confirmación de Solicitudes - ACTUALIZADA con normalización corregida
export async function parseConfirmacionSolicitudes(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        console.log("📊 Confirmación - Datos parseados:", jsonData.length)

        const processedData = jsonData.map((row: any, index) => {
          // Extraer CUIT del campo "CUIT"
          const cuitRaw = row["CUIT"] || ""
          const cuit = limpiarCuit(cuitRaw)

          // Detectar CCE en la descripción
          const descripcion = row["Comitente (Descripción)"] || ""
          const esCce = descripcion.includes("(CCE)")

          // Convertir fecha si existe - CORREGIDO para manejar números de Excel
          let fecha = ""
          const fechaRaw = row["Fecha"] || row["Fecha de Concertación"] || ""
          if (fechaRaw) {
            if (typeof fechaRaw === "number") {
              // Si es un número de Excel (como 45855.82430555556), convertir a fecha
              const date = new Date((fechaRaw - 25569) * 86400 * 1000)
              // Ajustar zona horaria para evitar desfase
              date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
              fecha = date.toLocaleDateString("es-AR")
            } else if (typeof fechaRaw === "string" && fechaRaw.includes(" ")) {
              // Extraer solo la parte de la fecha (antes del espacio)
              fecha = fechaRaw.split(" ")[0]
            } else {
              fecha = convertirFecha(String(fechaRaw))
            }
          }

          fecha = normalizarFecha(fecha)

          // CORREGIDO: Normalizar moneda usando la función actualizada
          const monedaRaw = row["Moneda Descripción"] || row["Moneda"] || "$"
          const monedaNormalizada = normalizarMoneda(monedaRaw)

          // Debug para verificar normalización
          if (monedaRaw !== monedaNormalizada) {
            console.log(`💱 Confirmación - Moneda normalizada: "${monedaRaw}" -> "${monedaNormalizada}"`)
          }

          return {
            ...row,
            id: `confirmacion-${Date.now()}-${index}`,
            origen: "confirmacion",
            CUIT: cuit, // Campo normalizado
            esCce,
            Fecha: fecha, // Campo normalizado
            Moneda: monedaNormalizada, // Campo normalizado CORREGIDO
            datosOriginales: { ...row },
          }
        })

        resolve(processedData)
      } catch (error) {
        console.error("❌ Error parseando Confirmación:", error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo Confirmación"))
    reader.readAsArrayBuffer(file)
  })
}

// Función para parsear Comprobantes de Pago
export async function parseRecibosPago(
  file: File,
  updateProgress?: (current: number, total: number, message: string) => void,
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        console.log("📊 Comprobantes - Datos parseados:", jsonData.length)

        const processedData = jsonData.map((row: any, index) => {
          if (updateProgress) {
            updateProgress(index + 1, jsonData.length, `Procesando Comprobante ${index + 1}/${jsonData.length}`)
          }

          // Extraer CUIT del campo "CUIT/CUIL titular de la cuenta" y limpiar guiones
          const cuitRaw = row["CUIT/CUIL titular de la cuenta"] || ""
          const cuit = limpiarCuit(cuitRaw)

          // Detectar CCE en la denominación
          const descripcion = row["Comitente (Denominación)"] || ""
          const esCce = descripcion.includes("(CCE)")

          // Parsear fecha correctamente - CORREGIDO para no restar un día
          let fechaLiquidacion = ""
          const fechaRaw = row["Fecha Liquidación"] || row["Fecha de Liquidación"] || ""
          if (fechaRaw) {
            if (typeof fechaRaw === "number") {
              // Si es un número de Excel, convertir a fecha SIN restar día
              const date = new Date((fechaRaw - 25569) * 86400 * 1000)
              // Ajustar zona horaria para evitar desfase
              date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
              fechaLiquidacion = date.toLocaleDateString("es-AR")
            } else {
              fechaLiquidacion = convertirFecha(String(fechaRaw))
            }
          }

          fechaLiquidacion = normalizarFecha(fechaLiquidacion)

          // Normalizar moneda usando la función actualizada
          const monedaRaw = row["Moneda (Símbolo)"] || "$"
          const monedaNormalizada = normalizarMoneda(monedaRaw)

          // Debug para verificar normalización
          if (monedaRaw !== monedaNormalizada) {
            console.log(`💱 Comprobantes - Moneda normalizada: "${monedaRaw}" -> "${monedaNormalizada}"`)
          }

          return {
            ...row,
            id: `recibo-${Date.now()}-${index}`,
            origen: "recibos",
            CUIT: cuit, // Campo normalizado
            Moneda: monedaNormalizada, // Campo normalizado
            "Fecha Liquidación": fechaLiquidacion, // Campo normalizado
            esCce,
            datosOriginales: { ...row },
          }
        })

        resolve(processedData)
      } catch (error) {
        console.error("❌ Error parseando Comprobantes:", error)
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo Comprobantes"))
    reader.readAsArrayBuffer(file)
  })
}

// Parser para Movimientos Bancarios - MEJORADO con análisis detallado de estructura
export async function parseMovimientosBancarios(
  file: File,
  esCera = false,
): Promise<{
  movimientos: any[]
  transferencias: any[]
  mercados: any[]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const movimientos: any[] = []
        const transferencias: any[] = []
        const mercados: any[] = []

        const moneda = inferirMoneda(file.name)

        console.log(`🔍 INICIANDO PROCESAMIENTO ARCHIVO BANCARIO:`)
        console.log(`📁 Archivo: ${file.name}`)
        console.log(`💰 Moneda inferida: ${moneda}`)
        console.log(`🏛️ Es CERA: ${esCera}`)
        console.log(`📊 Total filas: ${jsonData.length}`)

        // ANÁLISIS DETALLADO DE LA ESTRUCTURA DEL ARCHIVO
        console.log(`\n🔍 ANÁLISIS DE ESTRUCTURA DEL ARCHIVO:`)
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i] || []
          console.log(`Fila ${i}: [${row.map((cell) => `"${cell}"`).join(", ")}]`)
        }

        // Buscar la fila de headers de forma más inteligente
        let headerRow = -1
        let dataStartRow = -1

        // Buscar headers que contengan palabras clave
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i] || []
          const rowStr = row.join("").toLowerCase()

          if (rowStr.includes("fecha") && rowStr.includes("beneficiario") && rowStr.includes("importe")) {
            headerRow = i
            dataStartRow = i + 1
            console.log(`✅ Headers encontrados en fila ${i}`)
            break
          }
        }

        // Si no encontramos headers específicos, usar lógica por defecto
        if (headerRow === -1) {
          headerRow = 1 // Segunda fila por defecto
          dataStartRow = 2 // Tercera fila por defecto
          console.log(`⚠️ Headers no encontrados, usando fila ${headerRow} por defecto`)
        }

        // Verificar que tenemos suficientes filas
        if (jsonData.length <= dataStartRow) {
          console.warn(`❌ Archivo muy corto: ${jsonData.length} filas, necesita al menos ${dataStartRow + 1}`)
          resolve({ movimientos: [], transferencias: [], mercados: [] })
          return
        }

        const headers = jsonData[headerRow] || []
        console.log(`📋 Headers (fila ${headerRow}):`, headers)

        // Buscar índices de columnas específicos
        const colFecha = buscarColumna(headers, ["fecha"])
        const colBeneficiario = buscarColumna(headers, ["beneficiario"])
        const colDC = buscarColumna(headers, ["d/c", "dc"])
        const colImporte = buscarColumna(headers, ["importe"])

        console.log("🔍 Índices de columnas encontrados:", {
          colFecha,
          colBeneficiario,
          colDC,
          colImporte,
        })

        // Verificar que encontramos las columnas esenciales
        if (colFecha === -1 || colBeneficiario === -1 || colImporte === -1) {
          console.error("❌ No se encontraron columnas esenciales")
          console.log("Headers disponibles:", headers)
          resolve({ movimientos: [], transferencias: [], mercados: [] })
          return
        }

        // Procesar desde la fila de datos
        let filasProceadas = 0
        for (let i = dataStartRow; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            const fecha = convertirFecha(colFecha >= 0 ? row[colFecha]?.toString() || "" : "")
            const fechaNormalizada = normalizarFecha(fecha)
            const beneficiario = colBeneficiario >= 0 ? row[colBeneficiario]?.toString() || "" : ""
            const dc = colDC >= 0 ? row[colDC]?.toString().toUpperCase() || "" : ""
            const importeStr = colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0"
            const importe = convertirImporte(importeStr)

            const cuit = extraerCuitBeneficiario(beneficiario)

            // Saltar filas vacías o sin datos relevantes
            if (!fechaNormalizada && !beneficiario && importe === 0) {
              continue
            }

            filasProceadas++

            // Debug para importes USD
            if (moneda === "USD") {
              console.log(`💰 Fila ${i + 1} USD: Importe original: "${importeStr}" -> Convertido: ${importe}`)
            }

            // NUEVO: Ignorar movimientos con beneficiario que solo contiene guiones (impuestos)
            if (esImpuesto(beneficiario)) {
              console.log(`⚠️ Ignorando movimiento de impuesto: ${beneficiario}`)
              continue
            }

            // Crear objeto con datos originales
            const datosOriginales: Record<string, any> = {}
            headers.forEach((header, index) => {
              if (header && row[index] !== undefined) {
                datosOriginales[header] = row[index]
              }
            })

            // LOGS DEBUG DETALLADOS para cada movimiento
            console.log(`🔍 FILA ${i + 1}:`)
            console.log(`  📅 Fecha: ${fechaNormalizada}`)
            console.log(`  👤 Beneficiario: ${beneficiario}`)
            console.log(`  🆔 CUIT extraído: ${cuit}`)
            console.log(`  💳 D/C: ${dc}`)
            console.log(`  💰 Importe: ${importe} ${moneda}`)
            console.log(`  🏛️ Es CERA: ${esCera}`)

            // CORREGIDO: Lógica versión 120 para clasificar movimientos
            // 1. Transferencias monetarias: CUIT 30711610126 (tanto C como D)
            if (esCuitTransferencia(cuit)) {
              console.log(`  ✅ CLASIFICADO COMO: TRANSFERENCIA MONETARIA (CUIT: ${cuit})`)
              transferencias.push({
                id: `transferencia-${Date.now()}-${i}`,
                Fecha: fechaNormalizada,
                Beneficiario: beneficiario,
                CUIT: cuit,
                "D/C": dc,
                Importe: importe,
                Moneda: moneda,
                esCera,
                datosOriginales,
              })
              continue
            }

            // 2. Mercados: CUITs específicos de mercados (tanto C como D)
            if (esCuitMercado(cuit)) {
              console.log(`  ✅ CLASIFICADO COMO: MERCADO (CUIT: ${cuit})`)
              mercados.push({
                id: `mercado-${Date.now()}-${i}`,
                Fecha: fechaNormalizada,
                Beneficiario: beneficiario,
                CUIT: cuit,
                "D/C": dc,
                Importe: importe,
                Moneda: moneda,
                esCera,
                datosOriginales,
              })
              continue
            }






            // 3. Movimientos para conciliación: solo débitos (D) y no impuestos
            if (dc === "D") {
              // Desestimar CUIT 30604731018
              if (cuit === "30604731018") {
                console.log(`  ⚠️ DESCARTADO: CUIT excluido (${cuit})`)
                continue
              }

              console.log(`  ✅ CLASIFICADO COMO: MOVIMIENTO PARA CONCILIACIÓN`)
              movimientos.push({
                id: `movimiento-${Date.now()}-${i}`,
                Fecha: fechaNormalizada,
                Beneficiario: beneficiario,
                CUIT: cuit,
                "D/C": dc,
                Importe: importe,
                Moneda: moneda,
                esCera,
                tipoConciliacion: "no-conciliado",
                datosOriginales,
              })
            } else {
              console.log(`  ⚠️ DESCARTADO: No es débito (D/C: ${dc})`)
            }
          } catch (error) {
            console.error(`Error procesando fila ${i} de Movimientos:`, error)
          }
        }

        console.log(`\n📊 RESUMEN PROCESAMIENTO ARCHIVO BANCARIO:`)
        console.log(`📝 Filas procesadas: ${filasProceadas}`)
        console.log(`✅ Movimientos Bancarios procesados: ${movimientos.length} (CERA: ${esCera})`)
        console.log(`✅ Transferencias Monetarias: ${transferencias.length} (CERA: ${esCera})`)
        console.log(`✅ Movimientos Mercados: ${mercados.length} (CERA: ${esCera})`)

        // LOG DETALLADO DE TRANSFERENCIAS CERA
        if (esCera && transferencias.length > 0) {
          console.log(`\n🏛️ TRANSFERENCIAS CERA ENCONTRADAS:`)
          transferencias.forEach((trans, idx) => {
            console.log(
              `  ${idx + 1}. ${trans.Beneficiario} - CUIT: ${trans.CUIT} - ${trans["D/C"]} - ${trans.Importe} ${trans.Moneda}`,
            )
          })
        }

        // LOG DETALLADO DE MOVIMIENTOS CERA
        if (esCera && movimientos.length > 0) {
          console.log(`\n🏛️ MOVIMIENTOS CERA ENCONTRADOS:`)
          movimientos.forEach((mov, idx) => {
            console.log(
              `  ${idx + 1}. ${mov.Beneficiario} - CUIT: ${mov.CUIT} - ${mov["D/C"]} - ${mov.Importe} ${mov.Moneda}`,
            )
          })
        }

        // Si no encontramos nada, mostrar advertencia
        if (movimientos.length === 0 && transferencias.length === 0 && mercados.length === 0) {
          console.warn(`⚠️ NO SE ENCONTRARON MOVIMIENTOS VÁLIDOS EN EL ARCHIVO`)
          console.log(`Posibles causas:`)
          console.log(`- Formato de archivo incorrecto`)
          console.log(`- Headers no reconocidos`)
          console.log(`- Datos en filas inesperadas`)
          console.log(`- CUITs no extraídos correctamente`)
        }

        resolve({ movimientos, transferencias, mercados })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo"))
    reader.readAsArrayBuffer(file)
  })
}

// Función para crear solicitudes de pago unificadas
export function crearSolicitudesPago(statusData: any[], confirmacionData: any[]): any[] {
  console.log("🔄 Creando solicitudes unificadas...")

  const solicitudes = [...statusData, ...confirmacionData].map((item, index) => ({
    ...item,
    id: `solicitud-${Date.now()}-${index}`,
    tipoConciliacion: "no-conciliado" as TipoConciliacion,
  }))

  console.log("✅ Solicitudes creadas:", solicitudes.length)
  return solicitudes
}

// FUNCIÓN DE CONCILIACIÓN CORREGIDA - Versión 121 + CERA
export function realizarConciliacion(
  solicitudes: any[],
  comprobantes: any[],
  movimientos: any[],
): ResultadoConciliacion {
  console.log("🔄 Iniciando conciliación versión 121 + CERA...")

  // Preparar datos con estado inicial
  const solicitudesConEstado = solicitudes.map((s) => ({
    ...s,
    tipoConciliacion: "no-conciliado" as TipoConciliacion,
    conciliadoRecibos: false,
    conciliadoMovimientos: false,
    conciliadoRecibosPorImporte: false,
    conciliadoMovimientosPorImporte: false,
  }))

  const comprobantesConEstado = comprobantes.map((r) => ({
    ...r,
    tipoConciliacion: "no-conciliado" as TipoConciliacion,
    conciliadoSolicitudes: false,
    conciliadoMovimientos: false,
    conciliadoSolicitudesPorImporte: false,
    conciliadoMovimientosPorImporte: false,
  }))

  const movimientosConEstado = movimientos.map((m) => ({
    ...m,
    tipoConciliacion: "no-conciliado" as TipoConciliacion,
    conciliadoSolicitudes: false,
    conciliadoRecibos: false,
    conciliadoSolicitudesPorImporte: false,
    conciliadoRecibosPorImporte: false,
  }))

  // FASE 1: CONCILIACIÓN COMPLETA
  console.log("🔄 Fase 1: Conciliación completa (FECHA + CUIT + MONEDA + IMPORTE + CERA)...")

  // 1.1 Solicitudes vs Comprobantes (completa)
  solicitudesConEstado.forEach((solicitud) => {
    comprobantesConEstado.forEach((comprobante) => {
      if (solicitud.conciliadoRecibos || comprobante.conciliadoSolicitudes) return

      // Verificar coincidencia completa + CERA
      const fechaCoincide = solicitud.Fecha === comprobante["Fecha Liquidación"]
      const cuitCoincide = solicitud.CUIT === comprobante.CUIT
      const monedaCoincide = (solicitud.Moneda || "$") === (comprobante.Moneda || "$")
      const importeCoincide = Math.abs((solicitud.Importe || 0) - (comprobante.Importe || 0)) < 0.01
      const ceraCoincide = solicitud.esCce === comprobante.esCce // NUEVA VALIDACIÓN CERA

      if (fechaCoincide && cuitCoincide && monedaCoincide && importeCoincide && ceraCoincide) {
        solicitud.conciliadoRecibos = true
        comprobante.conciliadoSolicitudes = true
        console.log(`✅ Conciliación completa S-C: ${solicitud.id} <-> ${comprobante.id}`)
      }
    })
  })

  // 1.2 Solicitudes vs Movimientos (completa)
  solicitudesConEstado.forEach((solicitud) => {
    movimientosConEstado.forEach((movimiento) => {
      if (solicitud.conciliadoMovimientos || movimiento.conciliadoSolicitudes) return

      // Verificar coincidencia completa + CERA
      const fechaCoincide = solicitud.Fecha === movimiento.Fecha
      const cuitCoincide = solicitud.CUIT === movimiento.CUIT
      const monedaCoincide = (solicitud.Moneda || "$") === (movimiento.Moneda || "$")
      const importeCoincide = Math.abs((solicitud.Importe || 0) - (movimiento.Importe || 0)) < 0.01
      const ceraCoincide = solicitud.esCce === movimiento.esCera // NUEVA VALIDACIÓN CERA

      if (fechaCoincide && cuitCoincide && monedaCoincide && importeCoincide && ceraCoincide) {
        solicitud.conciliadoMovimientos = true
        movimiento.conciliadoSolicitudes = true
        console.log(`✅ Conciliación completa S-M: ${solicitud.id} <-> ${movimiento.id}`)
      }
    })
  })

  // 1.3 Comprobantes vs Movimientos (completa)
  comprobantesConEstado.forEach((comprobante) => {
    movimientosConEstado.forEach((movimiento) => {
      if (comprobante.conciliadoMovimientos || movimiento.conciliadoRecibos) return

      // Verificar coincidencia completa + CERA
      const fechaCoincide = comprobante["Fecha Liquidación"] === movimiento.Fecha
      const cuitCoincide = comprobante.CUIT === movimiento.CUIT
      const monedaCoincide = (comprobante.Moneda || "$") === (movimiento.Moneda || "$")
      const importeCoincide = Math.abs((comprobante.Importe || 0) - (movimiento.Importe || 0)) < 0.01
      const ceraCoincide = comprobante.esCce === movimiento.esCera // NUEVA VALIDACIÓN CERA

      if (fechaCoincide && cuitCoincide && monedaCoincide && importeCoincide && ceraCoincide) {
        comprobante.conciliadoMovimientos = true
        movimiento.conciliadoRecibos = true
        console.log(`✅ Conciliación completa C-M: ${comprobante.id} <-> ${movimiento.id}`)
      }
    })
  })

  // FASE 2: CONCILIACIÓN POR IMPORTE (solo para los que no se conciliaron completamente)
  console.log("🔄 Fase 2: Conciliación por importe (FECHA + MONEDA + IMPORTE + CERA, sin CUIT)...")

  // 2.1 Solicitudes vs Comprobantes (por importe)
  solicitudesConEstado.forEach((solicitud) => {
    if (solicitud.conciliadoRecibos) return // Ya conciliado completamente

    comprobantesConEstado.forEach((comprobante) => {
      if (
        comprobante.conciliadoSolicitudes ||
        solicitud.conciliadoRecibosPorImporte ||
        comprobante.conciliadoSolicitudesPorImporte
      )
        return

      // Verificar coincidencia por importe + CERA (sin CUIT)
      const fechaCoincide = solicitud.Fecha === comprobante["Fecha Liquidación"]
      const monedaCoincide = (solicitud.Moneda || "$") === (comprobante.Moneda || "$")
      const importeCoincide = Math.abs((solicitud.Importe || 0) - (comprobante.Importe || 0)) < 0.01
      const ceraCoincide = solicitud.esCce === comprobante.esCce // NUEVA VALIDACIÓN CERA

      if (fechaCoincide && monedaCoincide && importeCoincide && ceraCoincide) {
        solicitud.conciliadoRecibosPorImporte = true
        comprobante.conciliadoSolicitudesPorImporte = true
        console.log(`🟡 Conciliación por importe S-C: ${solicitud.id} <-> ${comprobante.id}`)
      }
    })
  })

  // 2.2 Solicitudes vs Movimientos (por importe)
  solicitudesConEstado.forEach((solicitud) => {
    if (solicitud.conciliadoMovimientos) return // Ya conciliado completamente

    movimientosConEstado.forEach((movimiento) => {
      if (
        movimiento.conciliadoSolicitudes ||
        solicitud.conciliadoMovimientosPorImporte ||
        movimiento.conciliadoSolicitudesPorImporte
      )
        return

      // Verificar coincidencia por importe + CERA (sin CUIT)
      const fechaCoincide = solicitud.Fecha === movimiento.Fecha
      const monedaCoincide = (solicitud.Moneda || "$") === (movimiento.Moneda || "$")
      const importeCoincide = Math.abs((solicitud.Importe || 0) - (movimiento.Importe || 0)) < 0.01
      const ceraCoincide = solicitud.esCce === movimiento.esCera // NUEVA VALIDACIÓN CERA

      if (fechaCoincide && monedaCoincide && importeCoincide && ceraCoincide) {
        solicitud.conciliadoMovimientosPorImporte = true
        movimiento.conciliadoSolicitudesPorImporte = true
        console.log(`🟡 Conciliación por importe S-M: ${solicitud.id} <-> ${movimiento.id}`)
      }
    })
  })

  // 2.3 Comprobantes vs Movimientos (por importe)
  comprobantesConEstado.forEach((comprobante) => {
    if (comprobante.conciliadoMovimientos) return // Ya conciliado completamente

    movimientosConEstado.forEach((movimiento) => {
      if (
        movimiento.conciliadoRecibos ||
        comprobante.conciliadoMovimientosPorImporte ||
        movimiento.conciliadoRecibosPorImporte
      )
        return

      // Verificar coincidencia por importe + CERA (sin CUIT)
      const fechaCoincide = comprobante["Fecha Liquidación"] === movimiento.Fecha
      const monedaCoincide = (comprobante.Moneda || "$") === (movimiento.Moneda || "$")
      const importeCoincide = Math.abs((comprobante.Importe || 0) - (movimiento.Importe || 0)) < 0.01
      const ceraCoincide = comprobante.esCce === movimiento.esCera // NUEVA VALIDACIÓN CERA

      if (fechaCoincide && monedaCoincide && importeCoincide && ceraCoincide) {
        comprobante.conciliadoMovimientosPorImporte = true
        movimiento.conciliadoRecibosPorImporte = true
        console.log(`🟡 Conciliación por importe C-M: ${comprobante.id} <-> ${movimiento.id}`)
      }
    })
  })

  // FASE 3: DETERMINAR TIPO DE CONCILIACIÓN FINAL
  console.log("🔄 Fase 3: Determinando tipos de conciliación final...")

  let conciliadosCompletos = 0
  let conciliadosPorImporte = 0

  // Determinar tipo para solicitudes
  solicitudesConEstado.forEach((solicitud) => {
    if (solicitud.conciliadoRecibos && solicitud.conciliadoMovimientos) {
      solicitud.tipoConciliacion = "completa"
      conciliadosCompletos++
    } else if (
      (solicitud.conciliadoRecibos || solicitud.conciliadoRecibosPorImporte) &&
      (solicitud.conciliadoMovimientos || solicitud.conciliadoMovimientosPorImporte)
    ) {
      solicitud.tipoConciliacion = "por-importe"
      conciliadosPorImporte++
    } else {
      solicitud.tipoConciliacion = "no-conciliado"
    }
  })

  // Determinar tipo para comprobantes
  comprobantesConEstado.forEach((comprobante) => {
    if (comprobante.conciliadoSolicitudes && comprobante.conciliadoMovimientos) {
      comprobante.tipoConciliacion = "completa"
      conciliadosCompletos++
    } else if (
      (comprobante.conciliadoSolicitudes || comprobante.conciliadoSolicitudesPorImporte) &&
      (comprobante.conciliadoMovimientos || comprobante.conciliadoMovimientosPorImporte)
    ) {
      comprobante.tipoConciliacion = "por-importe"
      conciliadosPorImporte++
    } else {
      comprobante.tipoConciliacion = "no-conciliado"
    }
  })

  // Determinar tipo para movimientos
  movimientosConEstado.forEach((movimiento) => {
    if (movimiento.conciliadoSolicitudes && movimiento.conciliadoRecibos) {
      movimiento.tipoConciliacion = "completa"
      conciliadosCompletos++
    } else if (
      (movimiento.conciliadoSolicitudes || movimiento.conciliadoSolicitudesPorImporte) &&
      (movimiento.conciliadoRecibos || movimiento.conciliadoRecibosPorImporte)
    ) {
      movimiento.tipoConciliacion = "por-importe"
      conciliadosPorImporte++
    } else {
      movimiento.tipoConciliacion = "no-conciliado"
    }
  })

  const noConciliados =
    solicitudesConEstado.filter((s) => s.tipoConciliacion === "no-conciliado").length +
    comprobantesConEstado.filter((r) => r.tipoConciliacion === "no-conciliado").length +
    movimientosConEstado.filter((m) => m.tipoConciliacion === "no-conciliado").length

  console.log("✅ Conciliación completada:", {
    completos: conciliadosCompletos,
    porImporte: conciliadosPorImporte,
    noConciliados,
  })

  return {
    solicitudesPago: solicitudesConEstado,
    recibosPago: comprobantesConEstado,
    movimientosBancarios: movimientosConEstado,
    transferenciasMonetarias: [],
    movimientosMercados: [],
    estadisticas: {
      totalSolicitudes: solicitudesConEstado.length,
      totalRecibos: comprobantesConEstado.length,
      totalMovimientos: movimientosConEstado.length,
      conciliadosCompletos,
      conciliadosPorImporte,
      noConciliados,
    },
  }
}
