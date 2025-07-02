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

        // Convertir a JSON manteniendo estructura original
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Usar índices numéricos
          defval: "", // Valor por defecto para celdas vacías
          raw: false, // No usar valores raw, convertir a string
        }) as string[][]

        console.log("📊 Datos extraídos:", jsonData.length, "filas")
        console.log("📋 Estructura completa:")
        jsonData.slice(0, 5).forEach((row, i) => {
          console.log(`Fila ${i + 1}:`, row)
        })

        const operaciones = parseExcelDataSimple(jsonData)
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

// Parser simplificado que lee por posición de columna
function parseExcelDataSimple(data: string[][]): TituloOperacion[] {
  const operaciones: TituloOperacion[] = []

  console.log("🔄 Iniciando parser simple por posición de columnas")

  // Buscar donde empiezan los datos (saltar headers)
  let startRow = 0
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i]
    if (row && row.length > 0) {
      const firstCell = row[0]?.toString().toLowerCase() || ""

      // Si la primera celda contiene "denominación", "cliente" o similar, es header
      if (firstCell.includes("denominación") || firstCell.includes("cliente")) {
        startRow = i + 1
        console.log(`📋 Header detectado en fila ${i + 1}, datos empiezan en fila ${startRow + 1}`)
        break
      }

      // Si la primera celda parece un nombre (más de 3 caracteres, no es header), empezar aquí
      if (firstCell.length > 3 && !firstCell.includes("denominación")) {
        startRow = i
        console.log(`📋 Datos detectados desde fila ${startRow + 1}`)
        break
      }
    }
  }

  console.log(`🔄 Procesando desde fila ${startRow + 1}`)

  // Procesar cada fila de datos
  for (let i = startRow; i < data.length; i++) {
    const row = data[i]

    // Saltar filas vacías
    if (!row || row.length === 0) {
      console.log(`⚠️ Fila ${i + 1}: vacía, saltando`)
      continue
    }

    // Verificar que tenga datos mínimos
    const hasValidData = row.some((cell) => cell && cell.toString().trim().length > 0)
    if (!hasValidData) {
      console.log(`⚠️ Fila ${i + 1}: sin datos válidos, saltando`)
      continue
    }

    try {
      console.log(`🔍 Procesando fila ${i + 1}:`, row)

      const operacion = parseRowByPosition(row, i + 1)
      if (operacion) {
        operaciones.push(operacion)
        console.log(`✅ Fila ${i + 1} procesada: ${operacion.denominacionCliente} - ${operacion.mercado}`)
      } else {
        console.log(`⚠️ Fila ${i + 1}: no se pudo procesar`)
      }
    } catch (error) {
      console.error(`❌ Error procesando fila ${i + 1}:`, error)
    }
  }

  console.log(`✅ Total operaciones procesadas: ${operaciones.length}`)
  return operaciones
}

// Parser por posición fija de columnas
function parseRowByPosition(row: string[], rowNumber: number): TituloOperacion | null {
  console.log(`🔍 Parseando fila ${rowNumber} por posición:`, row)

  // Función helper para obtener celda por índice
  const getCell = (index: number, defaultValue = ""): string => {
    if (index >= row.length) {
      console.log(`⚠️ Columna ${index} no existe, usando default: "${defaultValue}"`)
      return defaultValue
    }
    const value = row[index]
    const result = value ? value.toString().trim() : defaultValue
    console.log(`📋 Columna ${index}: "${result}"`)
    return result
  }

  // Mapeo por posición estándar (basado en tu imagen):
  // 0: Denominación Cliente
  // 1: CUIT/CUIL
  // 2: Especie
  // 3: Plazo
  // 4: Moneda
  // 5: Cantidad Comprada
  // 6: Precio Promedio Compra
  // 7: Monto Comprado
  // 8: Cantidad Vendida
  // 9: Precio Promedio Venta
  // 10: Monto Vendido
  // 11: Mercado

  const denominacionCliente = getCell(0, "Sin nombre")
  const cuitCuil = formatCuit(getCell(1, ""))
  const especie = getCell(2, "")
  const plazo = getCell(3, "0")
  const moneda = getCell(4, "Pesos")
  const cantidadComprada = formatNumber(getCell(5, "0"))
  const precioPromedioCompra = formatNumber(getCell(6, "0"))
  const montoComprado = formatNumber(getCell(7, "0"))
  const cantidadVendida = formatNumber(getCell(8, "0"))
  const precioPromedioVenta = formatNumber(getCell(9, "0"))
  const montoVendido = formatNumber(getCell(10, "0"))
  let mercado = getCell(11, "").toUpperCase()

  // Validaciones básicas
  if (!denominacionCliente || denominacionCliente === "Sin nombre") {
    console.warn(`⚠️ Fila ${rowNumber}: Sin nombre de cliente válido`)
    return null
  }

  if (!cuitCuil || cuitCuil.length < 8) {
    console.warn(`⚠️ Fila ${rowNumber}: CUIT no válido: "${cuitCuil}"`)
    return null
  }

  // Detectar mercado si no está en la columna 11
  if (!["BYMA", "MAV", "MAE"].includes(mercado)) {
    // Buscar mercado en toda la fila
    const allCells = row.join(" ").toUpperCase()
    if (allCells.includes("BYMA")) mercado = "BYMA"
    else if (allCells.includes("MAV")) mercado = "MAV"
    else if (allCells.includes("MAE")) mercado = "MAE"
    else {
      console.warn(`⚠️ Fila ${rowNumber}: No se pudo detectar mercado, usando BYMA por defecto`)
      mercado = "BYMA"
    }
  }

  const operacion: TituloOperacion = {
    denominacionCliente,
    cuitCuil,
    especie,
    plazo,
    moneda,
    cantidadComprada,
    precioPromedioCompra,
    montoComprado,
    cantidadVendida,
    precioPromedioVenta,
    montoVendido,
    mercado,
  }

  console.log(`✅ Operación creada para fila ${rowNumber}:`, {
    cliente: operacion.denominacionCliente,
    cuit: operacion.cuitCuil,
    mercado: operacion.mercado,
    montoComprado: operacion.montoComprado,
    montoVendido: operacion.montoVendido,
  })

  return operacion
}

// Formatear CUIT (manejar formato científico)
function formatCuit(cuit: string): string {
  if (!cuit) return ""

  console.log(`🔍 Formateando CUIT: "${cuit}"`)

  // Si está en formato científico (ej: 3.07E+10, 2.09E+10)
  if (cuit.includes("E+") || cuit.includes("e+")) {
    try {
      const number = Number.parseFloat(cuit)
      const result = Math.round(number).toString()
      console.log(`✅ CUIT científico convertido: ${cuit} -> ${result}`)
      return result
    } catch {
      console.warn(`⚠️ Error convirtiendo CUIT científico: ${cuit}`)
      return cuit
    }
  }

  // Limpiar caracteres no numéricos excepto guiones
  const cleaned = cuit.replace(/[^\d-]/g, "")
  console.log(`✅ CUIT limpiado: ${cuit} -> ${cleaned}`)
  return cleaned
}

// Formatear números (manejar decimales y comas)
function formatNumber(value: string): string {
  if (!value) return "0"

  console.log(`🔍 Formateando número: "${value}"`)

  // Limpiar el valor - mantener solo dígitos, puntos, comas y signos
  const cleaned = value.toString().replace(/[^\d.,-]/g, "")

  if (!cleaned || cleaned === "-") return "0"

  // Si tiene coma como separador decimal (formato argentino: 1.234,56)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Formato: 1.234,56 -> 1234.56
    const parts = cleaned.split(",")
    if (parts.length === 2) {
      const integerPart = parts[0].replace(/\./g, "") // Remover puntos de miles
      const decimalPart = parts[1]
      const normalized = `${integerPart}.${decimalPart}`
      const number = Number.parseFloat(normalized)
      const result = isNaN(number) ? "0" : number.toString()
      console.log(`✅ Número formato argentino: ${value} -> ${result}`)
      return result
    }
  }

  // Si solo tiene coma (puede ser decimal: 123,45)
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    const normalized = cleaned.replace(",", ".")
    const number = Number.parseFloat(normalized)
    const result = isNaN(number) ? "0" : number.toString()
    console.log(`✅ Número con coma decimal: ${value} -> ${result}`)
    return result
  }

  // Formato estándar con punto decimal
  const number = Number.parseFloat(cleaned)
  const result = isNaN(number) ? "0" : number.toString()
  console.log(`✅ Número estándar: ${value} -> ${result}`)
  return result
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
          raw: false,
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
