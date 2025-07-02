import * as XLSX from "xlsx"
import type { TituloOperacion } from "./titulos-parser"

// Función para leer archivo Excel y convertir a operaciones
export async function readTitulosFromExcel(file: File): Promise<TituloOperacion[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        console.log("📊 Leyendo archivo Excel:", file.name)

        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Tomar la primera hoja
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        console.log("📋 Hoja encontrada:", sheetName)

        // Convertir a JSON con headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Usar índices numéricos
          defval: "", // Valor por defecto para celdas vacías
        }) as string[][]

        console.log("📊 Datos JSON extraídos:", jsonData.length, "filas")
        console.log("📋 Primeras 3 filas:", jsonData.slice(0, 3))

        const operaciones = parseExcelData(jsonData)
        console.log("✅ Operaciones procesadas:", operaciones.length)

        resolve(operaciones)
      } catch (error) {
        console.error("❌ Error leyendo Excel:", error)
        reject(new Error("Error al procesar el archivo Excel"))
      }
    }

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"))
    }

    reader.readAsArrayBuffer(file)
  })
}

// Función para parsear datos de Excel con estructura conocida
function parseExcelData(data: string[][]): TituloOperacion[] {
  const operaciones: TituloOperacion[] = []

  // Buscar la fila de headers para determinar la estructura
  let headerRowIndex = -1
  let columnMapping: Record<string, number> = {}

  // Buscar headers conocidos
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i]
    if (row && row.length > 0) {
      const rowText = row.join(" ").toLowerCase()

      // Buscar indicadores de header
      if (
        rowText.includes("denominación") ||
        rowText.includes("cliente") ||
        rowText.includes("cuit") ||
        rowText.includes("especie")
      ) {
        headerRowIndex = i
        columnMapping = createColumnMapping(row)
        console.log("📋 Headers encontrados en fila", i + 1, ":", row)
        console.log("🗂️ Mapeo de columnas:", columnMapping)
        break
      }
    }
  }

  // Si no encontramos headers, asumir estructura estándar
  if (headerRowIndex === -1) {
    console.log("⚠️ No se encontraron headers, asumiendo estructura estándar")
    columnMapping = createStandardMapping()
    headerRowIndex = 0 // Empezar desde la primera fila
  }

  // Procesar filas de datos
  const startRow = headerRowIndex + 1
  for (let i = startRow; i < data.length; i++) {
    const row = data[i]

    if (!row || row.length === 0) continue

    // Verificar que la fila tenga datos válidos
    const hasData = row.some((cell) => cell && cell.toString().trim())
    if (!hasData) continue

    try {
      const operacion = parseExcelRow(row, columnMapping, i + 1)
      if (operacion) {
        operaciones.push(operacion)
        console.log(`✅ Fila ${i + 1} procesada:`, operacion.denominacionCliente, "-", operacion.mercado)
      }
    } catch (error) {
      console.warn(`⚠️ Error procesando fila ${i + 1}:`, error)
    }
  }

  return operaciones
}

// Crear mapeo de columnas basado en headers encontrados
function createColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}

  headers.forEach((header, index) => {
    if (!header) return

    const headerLower = header.toString().toLowerCase().trim()

    // Mapear headers conocidos
    if (headerLower.includes("denominación") || headerLower.includes("cliente")) {
      mapping.denominacionCliente = index
    } else if (headerLower.includes("cuit") || headerLower.includes("cuil")) {
      mapping.cuitCuil = index
    } else if (headerLower.includes("especie")) {
      mapping.especie = index
    } else if (headerLower.includes("plazo")) {
      mapping.plazo = index
    } else if (headerLower.includes("moneda")) {
      mapping.moneda = index
    } else if (headerLower.includes("cantidad") && headerLower.includes("compra")) {
      mapping.cantidadComprada = index
    } else if (headerLower.includes("precio") && headerLower.includes("compra")) {
      mapping.precioPromedioCompra = index
    } else if (headerLower.includes("monto") && headerLower.includes("compra")) {
      mapping.montoComprado = index
    } else if (headerLower.includes("cantidad") && headerLower.includes("vend")) {
      mapping.cantidadVendida = index
    } else if (headerLower.includes("precio") && headerLower.includes("vend")) {
      mapping.precioPromedioVenta = index
    } else if (headerLower.includes("monto") && headerLower.includes("vend")) {
      mapping.montoVendido = index
    } else if (headerLower.includes("mercado")) {
      mapping.mercado = index
    }
  })

  return mapping
}

// Crear mapeo estándar cuando no hay headers
function createStandardMapping(): Record<string, number> {
  return {
    denominacionCliente: 0,
    cuitCuil: 1,
    especie: 2,
    plazo: 3,
    moneda: 4,
    cantidadComprada: 5,
    precioPromedioCompra: 6,
    montoComprado: 7,
    cantidadVendida: 8,
    precioPromedioVenta: 9,
    montoVendido: 10,
    mercado: 11,
  }
}

// Parsear una fila individual del Excel
function parseExcelRow(row: string[], mapping: Record<string, number>, rowNumber: number): TituloOperacion | null {
  try {
    // Función helper para obtener valor de celda
    const getCell = (key: string): string => {
      const index = mapping[key]
      if (index === undefined || index >= row.length) return ""
      const value = row[index]
      return value ? value.toString().trim() : ""
    }

    // Extraer datos básicos
    const denominacionCliente = getCell("denominacionCliente")
    const cuitCuil = getCell("cuitCuil")
    const mercado = getCell("mercado").toUpperCase()

    // Validar datos mínimos requeridos
    if (!denominacionCliente && !cuitCuil) {
      console.warn(`⚠️ Fila ${rowNumber}: Sin cliente ni CUIT`)
      return null
    }

    // Validar mercado
    if (!["BYMA", "MAV", "MAE"].includes(mercado)) {
      // Intentar detectar mercado en otras columnas
      const allCells = row.join(" ").toUpperCase()
      let detectedMercado = ""

      if (allCells.includes("BYMA")) detectedMercado = "BYMA"
      else if (allCells.includes("MAV")) detectedMercado = "MAV"
      else if (allCells.includes("MAE")) detectedMercado = "MAE"

      if (!detectedMercado) {
        console.warn(`⚠️ Fila ${rowNumber}: Mercado no válido: "${mercado}"`)
        return null
      }
    }

    // Construir operación
    const operacion: TituloOperacion = {
      denominacionCliente: denominacionCliente || "Sin nombre",
      cuitCuil: formatCuit(cuitCuil),
      especie: getCell("especie") || "",
      plazo: getCell("plazo") || "0",
      moneda: getCell("moneda") || "Pesos",
      cantidadComprada: formatNumber(getCell("cantidadComprada")),
      precioPromedioCompra: formatNumber(getCell("precioPromedioCompra")),
      montoComprado: formatNumber(getCell("montoComprado")),
      cantidadVendida: formatNumber(getCell("cantidadVendida")),
      precioPromedioVenta: formatNumber(getCell("precioPromedioVenta")),
      montoVendido: formatNumber(getCell("montoVendido")),
      mercado: mercado || "BYMA",
    }

    return operacion
  } catch (error) {
    console.error(`❌ Error parseando fila ${rowNumber}:`, error)
    return null
  }
}

// Formatear CUIT (manejar formato científico)
function formatCuit(cuit: string): string {
  if (!cuit) return ""

  // Si está en formato científico (ej: 3.07E+10)
  if (cuit.includes("E+") || cuit.includes("e+")) {
    try {
      const number = Number.parseFloat(cuit)
      return Math.round(number).toString()
    } catch {
      return cuit
    }
  }

  return cuit.toString()
}

// Formatear números (manejar decimales y comas)
function formatNumber(value: string): string {
  if (!value) return "0"

  // Limpiar el valor
  const cleaned = value.toString().replace(/[^\d.,-]/g, "")

  if (!cleaned || cleaned === "-") return "0"

  // Convertir comas a puntos para decimales
  const normalized = cleaned.replace(",", ".")

  // Verificar si es un número válido
  const number = Number.parseFloat(normalized)
  if (isNaN(number)) return "0"

  return number.toString()
}

// Función para validar archivo Excel
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  // Verificar extensión
  const validExtensions = [".xlsx", ".xls", ".csv"]
  const fileName = file.name.toLowerCase()
  const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext))

  if (!hasValidExtension) {
    return {
      valid: false,
      error: "Formato de archivo no válido. Use .xlsx, .xls o .csv",
    }
  }

  // Verificar tamaño (máximo 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "El archivo es demasiado grande. Máximo 10MB.",
    }
  }

  return { valid: true }
}

// Función para detectar estructura del Excel
export async function detectExcelStructure(file: File): Promise<{
  hasHeaders: boolean
  columnCount: number
  rowCount: number
  sampleData: string[][]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        }) as string[][]

        // Analizar estructura
        const rowCount = jsonData.length
        const columnCount = Math.max(...jsonData.map((row) => row.length))
        const sampleData = jsonData.slice(0, 5) // Primeras 5 filas

        // Detectar si hay headers
        const firstRow = jsonData[0] || []
        const hasHeaders = firstRow.some(
          (cell) =>
            (cell && cell.toString().toLowerCase().includes("cliente")) ||
            cell.toString().toLowerCase().includes("cuit") ||
            cell.toString().toLowerCase().includes("especie"),
        )

        resolve({
          hasHeaders,
          columnCount,
          rowCount,
          sampleData,
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Error al leer archivo"))
    reader.readAsArrayBuffer(file)
  })
}
