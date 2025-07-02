import * as XLSX from "xlsx"
import type {
  StatusOrdenPago,
  ConfirmacionSolicitud,
  SolicitudPago,
  ReciboPago,
  MovimientoBancario,
  TransferenciaMonetaria,
  MovimientoMercado,
  ResultadoConciliacion,
} from "./conciliacion-types"
import { getCuitByComitente } from "./comitente-lookup"

// Cache para CUITs ya buscados
const cuitCache = new Map<string, string>()

// Función para limpiar CUIT (eliminar guiones y formato científico)
function limpiarCuit(cuit: string): string {
  if (!cuit) return ""

  let cuitLimpio = cuit.toString().replace(/[-\s]/g, "")

  // Manejar formato científico (ej: 3.07E+10)
  if (cuitLimpio.includes("E") || cuitLimpio.includes("e")) {
    try {
      const numero = Number.parseFloat(cuitLimpio)
      if (!isNaN(numero)) {
        cuitLimpio = Math.round(numero).toString()
      }
    } catch (error) {
      console.warn(`Error convirtiendo CUIT científico: ${cuit}`)
    }
  }

  // Asegurar que tenga 11 dígitos
  if (cuitLimpio.length === 10) {
    cuitLimpio = "0" + cuitLimpio
  }

  return cuitLimpio
}

// Función para convertir fecha de formato "Jul 27 2025 12:00AM" a "27/06/2025"
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

    // Manejar número de serie de Excel (como 45835.69652777778)
    if (typeof fechaStr === "number" || !isNaN(Number(fechaStr))) {
      const numeroSerie = Number(fechaStr)
      // Convertir número de serie de Excel a fecha (corregido para UTC)
      const fecha = new Date(Date.UTC(1900, 0, numeroSerie - 1))

      if (!isNaN(fecha.getTime())) {
        const dia = fecha.getUTCDate().toString().padStart(2, "0")
        const mes = (fecha.getUTCMonth() + 1).toString().padStart(2, "0")
        const año = fecha.getUTCFullYear()
        return `${dia}/${mes}/${año}`
      }
    }

    // Intentar conversión estándar como último recurso
    const fecha = new Date(fechaStr)
    if (!isNaN(fecha.getTime())) {
      const dia = fecha.getDate().toString().padStart(2, "0")
      const mes = (fecha.getMonth() + 1).toString().padStart(2, "0")
      const año = fecha.getFullYear()
      return `${dia}/${mes}/${año}`
    }

    console.warn(`Fecha no válida: ${fechaStr}`)
    return fechaStr.toString()
  } catch (error) {
    console.error(`Error convirtiendo fecha: ${fechaStr}`, error)
    return fechaStr.toString()
  }
}

// Función para extraer símbolo de moneda de texto como "Pesos / $", "Dolar MEP (Local) / USD D", "$", "USD D"
function extraerSimboloMoneda(monedaStr: string): string {
  if (!monedaStr) return "$" // Por defecto, pesos

  const monedaLimpia = monedaStr.toString().trim()
  const monedaUpper = monedaLimpia.toUpperCase()

  console.log(`🔍 Extrayendo moneda de: "${monedaStr}" -> Upper: "${monedaUpper}"`)

  // Si contiene "USD" en cualquier parte, es USD
  if (monedaUpper.includes("USD")) {
    console.log(`✅ Detectado USD en: "${monedaStr}"`)
    return "USD"
  }

  // Si es exactamente "$", devolver "$"
  if (monedaLimpia === "$") {
    console.log(`✅ Detectado $ en: "${monedaStr}"`)
    return "$"
  }

  // Buscar patrones específicos de dólar
  if (monedaUpper.includes("DOLAR") || monedaUpper.includes("DÓLAR") || monedaUpper.includes("DOLLAR")) {
    console.log(`✅ Detectado dólar por palabra clave en: "${monedaStr}"`)
    return "USD"
  }

  // Si contiene "/", extraer la parte después del "/"
  if (monedaStr.includes("/")) {
    const partes = monedaStr.split("/")
    const simbolo = partes[1].trim()
    console.log(`🔍 Parte después de /: "${simbolo}"`)

    if (simbolo === "$") {
      return "$"
    }
    if (simbolo.toUpperCase().includes("USD")) {
      return "USD"
    }
    return simbolo
  }

  // Si es "Pesos" o similar
  if (monedaUpper.includes("PESO")) {
    console.log(`✅ Detectado peso por palabra clave en: "${monedaStr}"`)
    return "$"
  }

  console.log(`⚠️ No se pudo determinar moneda, usando $ por defecto para: "${monedaStr}"`)
  return "$" // Por defecto, pesos
}

// Función para convertir importe de texto a número - MEJORADA para manejar "US$ 1,010,342.68"
function convertirImporte(importeStr: string): number {
  if (!importeStr) return 0

  // Convertir a string si no lo es
  let limpio = importeStr.toString().trim()

  // Si está vacío después del trim, devolver 0
  if (!limpio) return 0

  console.log(`🔍 Convirtiendo importe: "${importeStr}"`)

  // Detectar si es negativo
  const esNegativo = limpio.startsWith("-")

  // Remover símbolos de moneda específicos: US$, $, USD, etc.
  limpio = limpio.replace(/^-?US\$\s*/, "") // Remover "US$" al inicio
  limpio = limpio.replace(/^-?\$\s*/, "") // Remover "$" al inicio
  limpio = limpio.replace(/USD\s*/gi, "") // Remover "USD" en cualquier parte
  limpio = limpio.replace(/^-/, "") // Remover signo negativo temporal

  // Remover espacios adicionales
  limpio = limpio.trim()

  console.log(`🔍 Después de limpiar símbolos: "${limpio}"`)

  // Si después de limpiar está vacío, devolver 0
  if (!limpio) return 0

  // Manejar formato científico (ej: 1.23E+5)
  if (limpio.includes("E") || limpio.includes("e")) {
    try {
      const numero = Number.parseFloat(limpio)
      if (!isNaN(numero)) {
        const resultado = esNegativo ? -numero : numero
        console.log(`✅ Formato científico convertido: ${resultado}`)
        return resultado
      }
    } catch (error) {
      console.warn(`Error convirtiendo importe científico: ${importeStr}`)
      return 0
    }
  }

  // Manejar formato con comas como separadores de miles (ej: 1,010,342.68)
  // Si hay comas Y puntos, las comas son separadores de miles
  if (limpio.includes(",") && limpio.includes(".")) {
    // Verificar que el punto esté después de la última coma (formato americano)
    const ultimaComa = limpio.lastIndexOf(",")
    const ultimoPunto = limpio.lastIndexOf(".")

    if (ultimoPunto > ultimaComa) {
      // Formato americano: 1,010,342.68
      limpio = limpio.replace(/,/g, "") // Remover todas las comas
      console.log(`🔍 Formato americano detectado, después de remover comas: "${limpio}"`)
    }
  } else if (limpio.includes(",") && !limpio.includes(".")) {
    // Solo comas, podría ser separador decimal europeo o separador de miles
    const comas = (limpio.match(/,/g) || []).length
    if (comas === 1) {
      // Una sola coma, probablemente decimal europeo
      const partes = limpio.split(",")
      if (partes[1].length <= 2) {
        // Decimal europeo (ej: 1234,56)
        limpio = limpio.replace(",", ".")
        console.log(`🔍 Formato europeo detectado: "${limpio}"`)
      } else {
        // Separador de miles (ej: 1,234)
        limpio = limpio.replace(",", "")
        console.log(`🔍 Separador de miles detectado: "${limpio}"`)
      }
    } else {
      // Múltiples comas, separadores de miles
      limpio = limpio.replace(/,/g, "")
      console.log(`🔍 Múltiples separadores de miles: "${limpio}"`)
    }
  }

  const numero = Number.parseFloat(limpio)

  if (isNaN(numero)) {
    console.warn(`⚠️ No se pudo convertir importe: "${importeStr}" -> "${limpio}"`)
    return 0
  }

  const resultado = esNegativo ? -numero : numero
  console.log(`✅ Importe convertido: "${importeStr}" -> ${resultado}`)
  return resultado
}

// Función para extraer CUIT del beneficiario
function extraerCuitBeneficiario(beneficiario: string): string {
  if (!beneficiario) return ""

  // Buscar patrón "- XXXXXXXXXX" al final
  const match = beneficiario.match(/- (\d{11})/)
  return match ? match[1] : ""
}

// Función para inferir moneda del nombre del archivo
function inferirMoneda(nombreArchivo: string): string {
  const nombre = nombreArchivo.toLowerCase()
  if (nombre.includes("usd") || nombre.includes("dolar")) {
    return "USD"
  }
  return "$" // Pesos por defecto
}

// Función para detectar mercado en texto
function detectarMercado(texto: string): string {
  if (!texto) return ""

  const textoUpper = texto.toUpperCase()

  if (textoUpper.includes("BYMA")) return "BYMA"
  if (textoUpper.includes("MAV") || textoUpper.includes("MERCADO ARGENTINO DE VALORES")) return "MAV"
  if (textoUpper.includes("MAE")) return "MAE"
  if (textoUpper.includes("MATBA") || textoUpper.includes("ROFEX")) return "MATBA ROFEX"

  return ""
}

// Función para buscar índice de columna por nombre
function buscarColumna(headers: string[], nombres: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toString().toLowerCase() || ""
    for (const nombre of nombres) {
      if (header.includes(nombre.toLowerCase())) {
        return i
      }
    }
  }
  return -1
}

// Función para verificar si un beneficiario es de mercados - ACTUALIZADA
function esBeneficiarioMercado(beneficiario: string): boolean {
  const beneficiarioUpper = beneficiario.toUpperCase()

  const patronesMercados = [
    "MATBA ROFEX SA/A3 MERCADO SA",
    "S.A. BOLSAS Y MERCADOS AR",
    "BYMA S.A. BOLSAS Y MERCADOS AR",
    "MERCADO ARGENTINO DE VALORES",
    "MAE",
  ]

  return patronesMercados.some((patron) => beneficiarioUpper.includes(patron))
}

// Función para verificar si un CUIT es de mercados - NUEVA
function esCuitMercado(cuit: string): boolean {
  const cuitsMercados = [
    "30711610126", // CUIT original de mercados
    "30529177875", // NUEVO CUIT agregado por el usuario
  ]

  return cuitsMercados.includes(cuit)
}

// Función para verificar si un beneficiario es un impuesto (solo contiene guiones)
function esImpuesto(beneficiario: string): boolean {
  if (!beneficiario) return false

  // Verificar si solo contiene guiones o espacios
  return /^[-\s]+$/.test(beneficiario)
}

// Función optimizada para buscar CUIT con cache y lotes
async function buscarCuitOptimizado(
  comitenteNumero: string,
  onProgress?: (current: number, total: number, message: string) => void,
): Promise<string> {
  // Verificar cache primero
  if (cuitCache.has(comitenteNumero)) {
    return cuitCache.get(comitenteNumero) || ""
  }

  try {
    const cuitEncontrado = await getCuitByComitente(comitenteNumero)
    if (cuitEncontrado) {
      cuitCache.set(comitenteNumero, cuitEncontrado)
      return cuitEncontrado
    }
  } catch (error) {
    console.warn(`⚠️ Error buscando CUIT para comitente ${comitenteNumero}:`, error)
  }

  return ""
}

// Función para procesar CUITs en lotes con delay
async function procesarCuitsEnLotes<T extends { comitenteNumero: string; cuit: string }>(
  registros: T[],
  onProgress?: (current: number, total: number, message: string) => void,
): Promise<void> {
  const registrosSinCuit = registros.filter((r) => !r.cuit && r.comitenteNumero)

  if (registrosSinCuit.length === 0) return

  console.log(`🔍 Buscando CUITs para ${registrosSinCuit.length} registros...`)

  const LOTE_SIZE = 10 // Procesar de a 10 registros
  const DELAY_MS = 100 // Delay entre lotes para no saturar

  for (let i = 0; i < registrosSinCuit.length; i += LOTE_SIZE) {
    const lote = registrosSinCuit.slice(i, i + LOTE_SIZE)

    // Procesar lote en paralelo
    const promesas = lote.map(async (registro, index) => {
      const globalIndex = i + index + 1

      if (onProgress) {
        onProgress(globalIndex, registrosSinCuit.length, `Buscando CUIT para comitente ${registro.comitenteNumero}`)
      }

      const cuitEncontrado = await buscarCuitOptimizado(registro.comitenteNumero)
      if (cuitEncontrado) {
        registro.cuit = cuitEncontrado
        console.log(`✅ CUIT encontrado para comitente ${registro.comitenteNumero}: ${cuitEncontrado}`)
      }
    })

    await Promise.all(promesas)

    // Delay entre lotes para no saturar el sistema
    if (i + LOTE_SIZE < registrosSinCuit.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }
  }
}

// Función para detectar si hay headers en la primera fila
function tieneHeaders(primeraFila: any[]): boolean {
  if (!primeraFila || primeraFila.length === 0) return false

  // Buscar palabras clave típicas de headers
  const palabrasClave = [
    "fecha",
    "comitente",
    "cliente",
    "cuit",
    "cuil",
    "especie",
    "plazo",
    "moneda",
    "importe",
    "beneficiario",
    "estado",
    "mercado",
    "denominacion",
    "anulado",
    "titular",
    "símbolo",
    "simbolo",
  ]

  const textoFila = primeraFila.join(" ").toLowerCase()
  return palabrasClave.some((palabra) => textoFila.includes(palabra))
}

// Parser para Status Órdenes de Pago
export async function parseStatusOrdenesPago(
  file: File,
  onProgress?: (current: number, total: number, message: string) => void,
): Promise<StatusOrdenPago[]> {
  return new Promise(async (resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const resultados: StatusOrdenPago[] = []

        // Detectar si hay headers
        const hayHeaders = tieneHeaders(jsonData[0])
        const headerRow = hayHeaders ? 0 : -1
        const dataStartRow = hayHeaders ? 1 : 0

        console.log(`📋 Headers detectados: ${hayHeaders ? "SÍ" : "NO"}`)

        let headers: string[] = []
        let colFecha = -1,
          colComitenteNum = -1,
          colComitenteDesc = -1
        let colMoneda = -1,
          colImporte = -1,
          colCuit = -1,
          colEstado = -1
        let colEspecie = -1,
          colPlazo = -1,
          colMercado = -1

        if (hayHeaders) {
          headers = jsonData[headerRow] || []
          console.log("Headers Status Órdenes:", headers)

          // Buscar índices de columnas
          colFecha = buscarColumna(headers, ["fecha de concertación", "fecha concertación", "fecha"])
          colComitenteNum = buscarColumna(headers, [
            "comitente (número)",
            "comitente numero",
            "numero comitente",
            "cliente",
          ])
          colComitenteDesc = buscarColumna(headers, [
            "comitente (descripción)",
            "comitente descripcion",
            "descripcion",
            "denominacion",
          ])
          colMoneda = buscarColumna(headers, ["moneda"])
          colImporte = buscarColumna(headers, ["importe"])
          colCuit = buscarColumna(headers, ["cuit / cuil", "cuit/cuil", "cuit", "cuil"])
          colEstado = buscarColumna(headers, ["estado"])
          colEspecie = buscarColumna(headers, ["especie"])
          colPlazo = buscarColumna(headers, ["plazo"])
          colMercado = buscarColumna(headers, ["mercado"])
        } else {
          // Orden estándar sin headers: Cliente, CUIT, Especie, Plazo, Moneda, etc.
          colComitenteNum = 0
          colCuit = 1
          colEspecie = 2
          colPlazo = 3
          colMoneda = 4
          colImporte = 5
          colFecha = 6
          colEstado = 7
          colMercado = 8
          colComitenteDesc = 9
        }

        console.log("Índices Status Órdenes:", {
          colFecha,
          colComitenteNum,
          colComitenteDesc,
          colMoneda,
          colImporte,
          colCuit,
          colEstado,
          colEspecie,
          colPlazo,
          colMercado,
        })

        // Primera pasada: procesar todos los registros
        for (let i = dataStartRow; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            // Crear objeto con datos originales
            const datosOriginales: Record<string, any> = {}
            if (hayHeaders) {
              headers.forEach((header, index) => {
                if (header && row[index] !== undefined) {
                  datosOriginales[header] = row[index]
                }
              })
            } else {
              // Sin headers, usar índices
              row.forEach((valor, index) => {
                datosOriginales[`Columna_${index}`] = valor
              })
            }

            // Detectar mercado si no hay columna específica
            let mercado = colMercado >= 0 ? row[colMercado]?.toString() || "" : ""
            if (!mercado) {
              // Buscar en especie o descripción
              const especie = colEspecie >= 0 ? row[colEspecie]?.toString() || "" : ""
              const descripcion = colComitenteDesc >= 0 ? row[colComitenteDesc]?.toString() || "" : ""
              mercado = detectarMercado(especie) || detectarMercado(descripcion)
            }

            // Extraer y convertir moneda
            const monedaTexto = colMoneda >= 0 ? row[colMoneda]?.toString() || "$" : "$"
            const moneda = extraerSimboloMoneda(monedaTexto)

            const statusOrden: StatusOrdenPago = {
              fechaConcertacion: convertirFecha(colFecha >= 0 ? row[colFecha]?.toString() || "" : ""),
              comitenteNumero: colComitenteNum >= 0 ? row[colComitenteNum]?.toString() || "" : "",
              comitenteDescripcion: colComitenteDesc >= 0 ? row[colComitenteDesc]?.toString() || "" : "",
              moneda: moneda,
              importe: convertirImporte(colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0"),
              cuit: limpiarCuit(colCuit >= 0 ? row[colCuit]?.toString() || "" : ""),
              estado: colEstado >= 0 ? row[colEstado]?.toString() || "PENDIENTE" : "PENDIENTE",
              especie: colEspecie >= 0 ? row[colEspecie]?.toString() || "" : "",
              plazo: colPlazo >= 0 ? row[colPlazo]?.toString() || "" : "",
              mercado: mercado,
              datosOriginales,
            }

            if (statusOrden.comitenteNumero || statusOrden.cuit) {
              resultados.push(statusOrden)
            }
          } catch (error) {
            console.error(`Error procesando fila ${i} de Status Órdenes:`, error)
          }
        }

        // Segunda pasada: buscar CUITs faltantes SOLO para registros sin CUIT
        const registrosSinCuit = resultados.filter((r) => !r.cuit && r.comitenteNumero)
        if (registrosSinCuit.length > 0) {
          console.log(`🔍 Buscando CUITs para ${registrosSinCuit.length} registros sin CUIT...`)
          await procesarCuitsEnLotes(registrosSinCuit, onProgress)
        }

        console.log(`✅ Status Órdenes de Pago procesadas: ${resultados.length}`)
        resolve(resultados)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo"))
    reader.readAsArrayBuffer(file)
  })
}

// Parser para Confirmación de Solicitudes
export async function parseConfirmacionSolicitudes(file: File): Promise<ConfirmacionSolicitud[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const resultados: ConfirmacionSolicitud[] = []

        // Detectar si hay headers
        const hayHeaders = tieneHeaders(jsonData[0])
        const headerRow = hayHeaders ? 0 : -1
        const dataStartRow = hayHeaders ? 1 : 0

        console.log(`📋 Headers detectados en Confirmación: ${hayHeaders ? "SÍ" : "NO"}`)

        let headers: string[] = []
        let colFecha = -1,
          colEstado = -1,
          colComitenteNum = -1
        let colComitenteDenom = -1,
          colMonedaDesc = -1,
          colImporte = -1,
          colCuit = -1

        if (hayHeaders) {
          headers = jsonData[headerRow] || []
          console.log("Headers Confirmación:", headers)

          // Buscar índices de columnas
          colFecha = buscarColumna(headers, ["fecha"])
          colEstado = buscarColumna(headers, ["estado"])
          colComitenteNum = buscarColumna(headers, ["comitente (número)", "comitente numero", "numero", "cliente"])
          colComitenteDenom = buscarColumna(headers, [
            "comitente (denominación)",
            "comitente denominacion",
            "denominacion",
          ])
          colMonedaDesc = buscarColumna(headers, ["moneda (descripción)", "moneda descripcion", "moneda"])
          colImporte = buscarColumna(headers, ["importe"])
          // NUEVA: Buscar columna CUIT en Confirmación de Solicitudes
          colCuit = buscarColumna(headers, ["cuit / cuil", "cuit/cuil", "cuit", "cuil"])
        } else {
          // Orden estándar sin headers
          colFecha = 0
          colEstado = 1
          colComitenteNum = 2
          colComitenteDenom = 3
          colMonedaDesc = 4
          colImporte = 5
          colCuit = 6 // Agregar CUIT en posición 6
        }

        console.log("Índices Confirmación:", {
          colFecha,
          colEstado,
          colComitenteNum,
          colComitenteDenom,
          colMonedaDesc,
          colImporte,
          colCuit,
        })

        for (let i = dataStartRow; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            // Crear objeto con datos originales
            const datosOriginales: Record<string, any> = {}
            if (hayHeaders) {
              headers.forEach((header, index) => {
                if (header && row[index] !== undefined) {
                  datosOriginales[header] = row[index]
                }
              })
            } else {
              row.forEach((valor, index) => {
                datosOriginales[`Columna_${index}`] = valor
              })
            }

            // Extraer y convertir moneda
            const monedaTexto = colMonedaDesc >= 0 ? row[colMonedaDesc]?.toString() || "$" : "$"
            const moneda = extraerSimboloMoneda(monedaTexto)

            const confirmacion: ConfirmacionSolicitud = {
              fecha: convertirFecha(colFecha >= 0 ? row[colFecha]?.toString() || "" : ""),
              estado: colEstado >= 0 ? row[colEstado]?.toString() || "PENDIENTE" : "PENDIENTE",
              comitenteNumero: colComitenteNum >= 0 ? row[colComitenteNum]?.toString() || "" : "",
              comitenteDenominacion: colComitenteDenom >= 0 ? row[colComitenteDenom]?.toString() || "" : "",
              monedaDescripcion: moneda,
              importe: convertirImporte(colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0"),
              // NUEVA: Leer y limpiar CUIT de Confirmación de Solicitudes
              cuit: limpiarCuit(colCuit >= 0 ? row[colCuit]?.toString() || "" : ""),
              datosOriginales,
            }

            if (confirmacion.comitenteNumero) {
              resultados.push(confirmacion)
            }
          } catch (error) {
            console.error(`Error procesando fila ${i} de Confirmación:`, error)
          }
        }

        console.log(`✅ Confirmación de Solicitudes procesadas: ${resultados.length}`)
        resolve(resultados)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo"))
    reader.readAsArrayBuffer(file)
  })
}

// Parser para Recibos de Pago
export async function parseRecibosPago(
  file: File,
  onProgress?: (current: number, total: number, message: string) => void,
): Promise<ReciboPago[]> {
  return new Promise(async (resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const resultados: ReciboPago[] = []

        // Detectar si hay headers
        const hayHeaders = tieneHeaders(jsonData[0])
        const headerRow = hayHeaders ? 0 : -1
        const dataStartRow = hayHeaders ? 1 : 0

        console.log(`📋 Headers detectados en Recibos: ${hayHeaders ? "SÍ" : "NO"}`)

        let headers: string[] = []
        let colFechaLiq = -1,
          colComitenteDenom = -1,
          colComitenteNum = -1
        let colImporte = -1,
          colCuit = -1,
          colMoneda = -1,
          colAnulado = -1

        if (hayHeaders) {
          headers = jsonData[headerRow] || []
          console.log("Headers Recibos:", headers)

          // Buscar índices de columnas
          colFechaLiq = buscarColumna(headers, ["fecha de liquidación", "fecha liquidacion", "fecha"])
          colComitenteDenom = buscarColumna(headers, [
            "comitente (denominación)",
            "comitente denominacion",
            "denominacion",
          ])
          colComitenteNum = buscarColumna(headers, ["comitente (número)", "comitente numero", "numero", "cliente"])
          colImporte = buscarColumna(headers, ["importe"])
          colCuit = buscarColumna(headers, ["cuit/cuil titular", "cuit", "cuil"])
          // CORREGIDA: Buscar columna de moneda específica "Moneda (Símbolo)"
          colMoneda = buscarColumna(headers, [
            "moneda (símbolo)",
            "moneda símbolo",
            "moneda (simbolo)",
            "moneda simbolo",
            "titular moneda (símbolo)",
            "titular moneda símbolo",
            "moneda",
          ])
          // NUEVA: Buscar columna "esta anulado"
          colAnulado = buscarColumna(headers, ["esta anulado", "anulado"])
        } else {
          // Orden estándar sin headers
          colFechaLiq = 0
          colComitenteDenom = 1
          colComitenteNum = 2
          colImporte = 3
          colCuit = 4
          colMoneda = 5
          colAnulado = 6
        }

        console.log("Índices Recibos:", {
          colFechaLiq,
          colComitenteDenom,
          colComitenteNum,
          colImporte,
          colCuit,
          colMoneda,
          colAnulado,
        })

        // Primera pasada: procesar todos los registros
        for (let i = dataStartRow; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            // NUEVO: Filtrar registros anulados
            if (colAnulado >= 0) {
              const estaAnulado = row[colAnulado]?.toString() || "0"
              // Si "esta anulado" es diferente de 0, saltar este registro
              if (estaAnulado !== "0" && estaAnulado.toLowerCase() !== "false") {
                console.log(`⚠️ Saltando recibo anulado en fila ${i + 1}`)
                continue
              }
            }

            // Crear objeto con datos originales
            const datosOriginales: Record<string, any> = {}
            if (hayHeaders) {
              headers.forEach((header, index) => {
                if (header && row[index] !== undefined) {
                  datosOriginales[header] = row[index]
                }
              })
            } else {
              row.forEach((valor, index) => {
                datosOriginales[`Columna_${index}`] = valor
              })
            }

            // Extraer y convertir moneda desde la columna específica
            const monedaTexto = colMoneda >= 0 ? row[colMoneda]?.toString() || "$" : "$"
            const moneda = extraerSimboloMoneda(monedaTexto)

            console.log(`📋 Fila ${i + 1}: Moneda original: "${monedaTexto}" -> Convertida: "${moneda}"`)

            const recibo: ReciboPago = {
              id: `recibo-${Date.now()}-${i}`,
              fechaLiquidacion: convertirFecha(colFechaLiq >= 0 ? row[colFechaLiq]?.toString() || "" : ""),
              comitenteDenominacion: colComitenteDenom >= 0 ? row[colComitenteDenom]?.toString() || "" : "",
              comitenteNumero: colComitenteNum >= 0 ? row[colComitenteNum]?.toString() || "" : "",
              importe: convertirImporte(colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0"),
              cuit: limpiarCuit(colCuit >= 0 ? row[colCuit]?.toString() || "" : ""),
              moneda: moneda, // Usar la moneda extraída
              conciliadoSolicitudes: false,
              conciliadoMovimientos: false,
              // NUEVOS: Inicializar campos de conciliación por importe
              conciliadoSolicitudesPorImporte: false,
              conciliadoMovimientosPorImporte: false,
              tipoConciliacion: "no-conciliado",
              datosOriginales,
            }

            if (recibo.comitenteNumero || recibo.cuit) {
              resultados.push(recibo)
            }
          } catch (error) {
            console.error(`Error procesando fila ${i} de Recibos:`, error)
          }
        }

        // Segunda pasada: buscar CUITs faltantes SOLO para registros sin CUIT
        const recibosSinCuit = resultados.filter((r) => !r.cuit && r.comitenteNumero)
        if (recibosSinCuit.length > 0) {
          console.log(`🔍 Buscando CUITs para ${recibosSinCuit.length} recibos sin CUIT...`)
          await procesarCuitsEnLotes(recibosSinCuit, onProgress)
        }

        console.log(`✅ Recibos de Pago procesados: ${resultados.length}`)
        resolve(resultados)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo"))
    reader.readAsArrayBuffer(file)
  })
}

// Parser para Movimientos Bancarios - ACTUALIZADO
export async function parseMovimientosBancarios(file: File): Promise<{
  movimientos: MovimientoBancario[]
  transferencias: TransferenciaMonetaria[]
  mercados: MovimientoMercado[]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const movimientos: MovimientoBancario[] = []
        const transferencias: TransferenciaMonetaria[] = []
        const mercados: MovimientoMercado[] = []

        const moneda = inferirMoneda(file.name)

        // Para movimientos bancarios: primera fila se omite, segunda fila son headers (índice 1), tercera fila en adelante es contenido (índice 2+)
        const headerRow = 1 // Segunda fila (índice 1)

        if (jsonData.length < 3) {
          console.warn("Archivo de movimientos bancarios muy corto")
          resolve({ movimientos: [], transferencias: [], mercados: [] })
          return
        }

        const headers = jsonData[headerRow] || []
        console.log("Headers Movimientos Bancarios:", headers)

        // Buscar índices de columnas específicos según tu ejemplo
        const colFecha = buscarColumna(headers, ["fecha"])
        const colBeneficiario = buscarColumna(headers, ["beneficiario"])
        const colDC = buscarColumna(headers, ["d/c", "dc"])
        const colImporte = buscarColumna(headers, ["importe"])

        console.log("Índices Movimientos:", {
          colFecha,
          colBeneficiario,
          colDC,
          colImporte,
        })

        // Verificar que encontramos las columnas esperadas
        if (colFecha !== 0 || colBeneficiario !== 4 || colDC !== 8 || colImporte !== 9) {
          console.warn("Índices no coinciden con el formato esperado, usando los encontrados")
        }

        // Procesar desde la tercera fila (índice 2)
        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            const fecha = convertirFecha(colFecha >= 0 ? row[colFecha]?.toString() || "" : "")
            const beneficiario = colBeneficiario >= 0 ? row[colBeneficiario]?.toString() || "" : ""
            const dc = colDC >= 0 ? row[colDC]?.toString().toUpperCase() || "" : ""
            const importeStr = colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0"
            const importe = convertirImporte(importeStr)
            const cuit = extraerCuitBeneficiario(beneficiario)

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

            // Filtrar solo movimientos "D" (débitos) para conciliación
            if (dc === "D") {
              // Desestimar CUIT 30604731018
              if (cuit === "30604731018") {
                continue
              }

              // ACTUALIZADO: Verificar si es CUIT de mercados (incluye el nuevo CUIT)
              if (esCuitMercado(cuit) && esBeneficiarioMercado(beneficiario)) {
                mercados.push({
                  id: `mercado-${Date.now()}-${i}`,
                  fecha,
                  beneficiario,
                  cuit,
                  dc,
                  importe,
                  moneda,
                  datosOriginales,
                })
                continue
              }

              // ACTUALIZADO: Separar CUITs de mercados para transferencias monetarias (no mercados)
              if (esCuitMercado(cuit) && !esBeneficiarioMercado(beneficiario)) {
                transferencias.push({
                  id: `transferencia-${Date.now()}-${i}`,
                  fecha,
                  beneficiario,
                  cuit,
                  dc,
                  importe,
                  moneda,
                  datosOriginales,
                })
                continue
              }

              // Movimientos normales para conciliación
              movimientos.push({
                id: `movimiento-${Date.now()}-${i}`,
                fecha,
                beneficiario,
                cuit,
                dc,
                importe,
                moneda,
                conciliadoSolicitudes: false,
                conciliadoRecibos: false,
                // NUEVOS: Inicializar campos de conciliación por importe
                conciliadoSolicitudesPorImporte: false,
                conciliadoRecibosPorImporte: false,
                tipoConciliacion: "no-conciliado",
                datosOriginales,
              })
            }

            // ACTUALIZADO: Para transferencias monetarias y mercados, incluir tanto C como D
            if (esCuitMercado(cuit)) {
              // Verificar si es beneficiario de mercados
              if (esBeneficiarioMercado(beneficiario)) {
                mercados.push({
                  id: `mercado-${Date.now()}-${i}`,
                  fecha,
                  beneficiario,
                  cuit,
                  dc,
                  importe,
                  moneda,
                  datosOriginales,
                })
              } else {
                // Si no es mercado, es transferencia monetaria
                transferencias.push({
                  id: `transferencia-${Date.now()}-${i}`,
                  fecha,
                  beneficiario,
                  cuit,
                  dc,
                  importe,
                  moneda,
                  datosOriginales,
                })
              }
            }
          } catch (error) {
            console.error(`Error procesando fila ${i} de Movimientos:`, error)
          }
        }

        console.log(`✅ Movimientos Bancarios procesados: ${movimientos.length}`)
        console.log(`✅ Transferencias Monetarias: ${transferencias.length}`)
        console.log(`✅ Movimientos Mercados: ${mercados.length}`)

        resolve({ movimientos, transferencias, mercados })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error leyendo archivo"))
    reader.readAsArrayBuffer(file)
  })
}

// Función para unir Status y Confirmación en Solicitudes de Pago
export function crearSolicitudesPago(
  statusOrdenes: StatusOrdenPago[],
  confirmaciones: ConfirmacionSolicitud[],
): SolicitudPago[] {
  const solicitudes: SolicitudPago[] = []

  // Agregar Status Órdenes de Pago
  statusOrdenes.forEach((status, index) => {
    solicitudes.push({
      id: `solicitud-status-${index}`,
      fecha: status.fechaConcertacion,
      comitenteNumero: status.comitenteNumero,
      comitenteDescripcion: status.comitenteDescripcion,
      moneda: status.moneda === "Pesos" ? "$" : status.moneda === "Dolar" ? "USD" : status.moneda,
      importe: status.importe,
      cuit: status.cuit,
      estado: status.estado,
      origen: "status",
      conciliadoRecibos: false,
      conciliadoMovimientos: false,
      // NUEVOS: Inicializar campos de conciliación por importe
      conciliadoRecibosPorImporte: false,
      conciliadoMovimientosPorImporte: false,
      tipoConciliacion: "no-conciliado",
      datosOriginales: status.datosOriginales,
    })
  })

  // Agregar Confirmaciones de Solicitudes
  confirmaciones.forEach((confirmacion, index) => {
    solicitudes.push({
      id: `solicitud-confirmacion-${index}`,
      fecha: confirmacion.fecha,
      comitenteNumero: confirmacion.comitenteNumero,
      comitenteDescripcion: confirmacion.comitenteDenominacion,
      moneda:
        confirmacion.monedaDescripcion === "Pesos"
          ? "$"
          : confirmacion.monedaDescripcion === "Dolar"
            ? "USD"
            : confirmacion.monedaDescripcion,
      importe: confirmacion.importe,
      cuit: confirmacion.cuit, // AHORA usa el CUIT de Confirmación de Solicitudes
      estado: confirmacion.estado,
      origen: "confirmacion",
      conciliadoRecibos: false,
      conciliadoMovimientos: false,
      // NUEVOS: Inicializar campos de conciliación por importe
      conciliadoRecibosPorImporte: false,
      conciliadoMovimientosPorImporte: false,
      tipoConciliacion: "no-conciliado",
      datosOriginales: confirmacion.datosOriginales,
    })
  })

  return solicitudes
}

// Función para generar clave de conciliación completa
function generarClaveConciliacion(fecha: string, cuit: string, moneda: string, importe: number): string {
  const monedaNormalizada = moneda === "Pesos" ? "$" : moneda === "Dolar" ? "USD" : moneda
  return `${fecha}-${cuit}-${monedaNormalizada}-${importe.toFixed(2)}`
}

// NUEVA: Función para generar clave de conciliación solo por importe
function generarClaveImporte(importe: number): string {
  return importe.toFixed(2)
}

// NUEVA: Función para conciliación automática por importe - CORREGIDA
function conciliarPorImporte(
  solicitudes: SolicitudPago[],
  recibos: ReciboPago[],
  movimientos: MovimientoBancario[],
): void {
  console.log("🟡 Iniciando conciliación automática por importe...")

  // Crear mapas de importes para los registros no conciliados
  const solicitudesNoConciliadas = solicitudes.filter((s) => s.tipoConciliacion === "no-conciliado")
  const recibosNoConciliados = recibos.filter((r) => r.tipoConciliacion === "no-conciliado")
  const movimientosNoConciliados = movimientos.filter((m) => m.tipoConciliacion === "no-conciliado")

  console.log(
    `📊 Registros no conciliados: ${solicitudesNoConciliadas.length} solicitudes, ${recibosNoConciliados.length} recibos, ${movimientosNoConciliados.length} movimientos`,
  )

  // Crear mapas por importe
  const mapaSolicitudesPorImporte = new Map<string, SolicitudPago[]>()
  const mapaRecibosPorImporte = new Map<string, ReciboPago[]>()
  const mapaMovimientosPorImporte = new Map<string, MovimientoBancario[]>()

  // Indexar solicitudes no conciliadas por importe
  solicitudesNoConciliadas.forEach((solicitud) => {
    const claveImporte = generarClaveImporte(solicitud.importe)
    if (!mapaSolicitudesPorImporte.has(claveImporte)) {
      mapaSolicitudesPorImporte.set(claveImporte, [])
    }
    mapaSolicitudesPorImporte.get(claveImporte)!.push(solicitud)
  })

  // Indexar recibos no conciliados por importe
  recibosNoConciliados.forEach((recibo) => {
    const claveImporte = generarClaveImporte(recibo.importe)
    if (!mapaRecibosPorImporte.has(claveImporte)) {
      mapaRecibosPorImporte.set(claveImporte, [])
    }
    mapaRecibosPorImporte.get(claveImporte)!.push(recibo)
  })

  // Indexar movimientos no conciliados por importe
  movimientosNoConciliados.forEach((movimiento) => {
    const claveImporte = generarClaveImporte(movimiento.importe)
    if (!mapaMovimientosPorImporte.has(claveImporte)) {
      mapaMovimientosPorImporte.set(claveImporte, [])
    }
    mapaMovimientosPorImporte.get(claveImporte)!.push(movimiento)
  })

  let conciliadosPorImporte = 0

  // CORREGIDO: Conciliar por grupos de importe
  const importesUnicos = new Set([
    ...Array.from(mapaSolicitudesPorImporte.keys()),
    ...Array.from(mapaRecibosPorImporte.keys()),
    ...Array.from(mapaMovimientosPorImporte.keys()),
  ])

  for (const importe of importesUnicos) {
    const solicitudesConImporte = mapaSolicitudesPorImporte.get(importe) || []
    const recibosConImporte = mapaRecibosPorImporte.get(importe) || []
    const movimientosConImporte = mapaMovimientosPorImporte.get(importe) || []

    // Si hay al menos 2 tipos de registros con el mismo importe, conciliar
    const tiposDisponibles = [
      solicitudesConImporte.length > 0,
      recibosConImporte.length > 0,
      movimientosConImporte.length > 0,
    ].filter(Boolean).length

    if (tiposDisponibles >= 2) {
      console.log(
        `🟡 Conciliando por importe ${importe}: ${solicitudesConImporte.length} solicitudes, ${recibosConImporte.length} recibos, ${movimientosConImporte.length} movimientos`,
      )

      // Marcar solicitudes
      solicitudesConImporte.forEach((solicitud) => {
        if (recibosConImporte.length > 0) {
          solicitud.conciliadoRecibosPorImporte = true
        }
        if (movimientosConImporte.length > 0) {
          solicitud.conciliadoMovimientosPorImporte = true
        }
        solicitud.tipoConciliacion = "por-importe"
        conciliadosPorImporte++
      })

      // Marcar recibos
      recibosConImporte.forEach((recibo) => {
        if (solicitudesConImporte.length > 0) {
          recibo.conciliadoSolicitudesPorImporte = true
        }
        if (movimientosConImporte.length > 0) {
          recibo.conciliadoMovimientosPorImporte = true
        }
        recibo.tipoConciliacion = "por-importe"
        conciliadosPorImporte++
      })

      // Marcar movimientos
      movimientosConImporte.forEach((movimiento) => {
        if (solicitudesConImporte.length > 0) {
          movimiento.conciliadoSolicitudesPorImporte = true
        }
        if (recibosConImporte.length > 0) {
          movimiento.conciliadoRecibosPorImporte = true
        }
        movimiento.tipoConciliacion = "por-importe"
        conciliadosPorImporte++
      })
    }
  }

  console.log(`🟡 Conciliación por importe completada: ${conciliadosPorImporte} registros conciliados`)
}

// Función principal de conciliación (ACTUALIZADA)
export function realizarConciliacion(
  solicitudes: SolicitudPago[],
  recibos: ReciboPago[],
  movimientos: MovimientoBancario[],
): ResultadoConciliacion {
  console.log("🔄 Iniciando conciliación completa...")

  // PASO 1: Conciliación completa (fecha + CUIT + moneda + importe)
  console.log("🟢 Paso 1: Conciliación completa...")

  // Crear mapas de claves para búsqueda rápida
  const mapaSolicitudes = new Map<string, SolicitudPago[]>()
  const mapaRecibos = new Map<string, ReciboPago[]>()
  const mapaMovimientos = new Map<string, MovimientoBancario[]>()

  // Indexar solicitudes
  solicitudes.forEach((solicitud) => {
    const clave = generarClaveConciliacion(solicitud.fecha, solicitud.cuit, solicitud.moneda, solicitud.importe)
    if (!mapaSolicitudes.has(clave)) {
      mapaSolicitudes.set(clave, [])
    }
    mapaSolicitudes.get(clave)!.push(solicitud)
  })

  // Indexar recibos
  recibos.forEach((recibo) => {
    // Usar la moneda del recibo si está disponible, de lo contrario asumir pesos
    const moneda = recibo.moneda || "$"
    const clave = generarClaveConciliacion(recibo.fechaLiquidacion, recibo.cuit, moneda, recibo.importe)
    if (!mapaRecibos.has(clave)) {
      mapaRecibos.set(clave, [])
    }
    mapaRecibos.get(clave)!.push(recibo)
  })

  // Indexar movimientos
  movimientos.forEach((movimiento) => {
    const clave = generarClaveConciliacion(movimiento.fecha, movimiento.cuit, movimiento.moneda, movimiento.importe)
    if (!mapaMovimientos.has(clave)) {
      mapaMovimientos.set(clave, [])
    }
    mapaMovimientos.get(clave)!.push(movimiento)
  })

  // Realizar conciliación completa
  let conciliadosCompletos = 0

  // Conciliar solicitudes
  solicitudes.forEach((solicitud) => {
    const clave = generarClaveConciliacion(solicitud.fecha, solicitud.cuit, solicitud.moneda, solicitud.importe)

    if (mapaRecibos.has(clave)) {
      solicitud.conciliadoRecibos = true
      mapaRecibos.get(clave)!.forEach((recibo) => {
        recibo.conciliadoSolicitudes = true
      })
    }

    if (mapaMovimientos.has(clave)) {
      solicitud.conciliadoMovimientos = true
      mapaMovimientos.get(clave)!.forEach((movimiento) => {
        movimiento.conciliadoSolicitudes = true
      })
    }

    // Actualizar tipo de conciliación
    if (solicitud.conciliadoRecibos && solicitud.conciliadoMovimientos) {
      solicitud.tipoConciliacion = "completa"
      conciliadosCompletos++
    }
  })

  // Conciliar recibos con movimientos
  recibos.forEach((recibo) => {
    // Usar la moneda del recibo si está disponible, de lo contrario asumir pesos
    const moneda = recibo.moneda || "$"
    const clave = generarClaveConciliacion(recibo.fechaLiquidacion, recibo.cuit, moneda, recibo.importe)

    if (mapaMovimientos.has(clave)) {
      recibo.conciliadoMovimientos = true
      mapaMovimientos.get(clave)!.forEach((movimiento) => {
        movimiento.conciliadoRecibos = true
      })
    }

    // Actualizar tipo de conciliación para recibos
    if (recibo.conciliadoSolicitudes && recibo.conciliadoMovimientos) {
      recibo.tipoConciliacion = "completa"
    }
  })

  // Actualizar tipo de conciliación para movimientos
  movimientos.forEach((movimiento) => {
    if (movimiento.conciliadoSolicitudes && movimiento.conciliadoRecibos) {
      movimiento.tipoConciliacion = "completa"
    }
  })

  console.log(`🟢 Conciliación completa: ${conciliadosCompletos} registros conciliados completamente`)

  // PASO 2: Conciliación automática por importe para los no conciliados
  conciliarPorImporte(solicitudes, recibos, movimientos)

  // Calcular estadísticas finales
  const conciliadosPorImporte =
    solicitudes.filter((s) => s.tipoConciliacion === "por-importe").length +
    recibos.filter((r) => r.tipoConciliacion === "por-importe").length +
    movimientos.filter((m) => m.tipoConciliacion === "por-importe").length

  const totalRegistros = solicitudes.length + recibos.length + movimientos.length
  const noConciliados = totalRegistros - conciliadosCompletos * 3 - conciliadosPorImporte

  console.log(`✅ Conciliación total completada:`)
  console.log(`   🟢 Completos: ${conciliadosCompletos}`)
  console.log(`   🟡 Por importe: ${conciliadosPorImporte}`)
  console.log(`   🔴 No conciliados: ${noConciliados}`)

  return {
    solicitudesPago: solicitudes,
    recibosPago: recibos,
    movimientosBancarios: movimientos,
    transferenciasMonetarias: [], // Se llenarán desde el parser
    movimientosMercados: [], // Se llenarán desde el parser
    estadisticas: {
      totalSolicitudes: solicitudes.length,
      totalRecibos: recibos.length,
      totalMovimientos: movimientos.length,
      conciliadosCompletos,
      conciliadosPorImporte,
      noConciliados,
    },
  }
}
