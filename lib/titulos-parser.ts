// Interfaz para los datos de títulos
export interface TituloOperacion {
  denominacionCliente: string
  cuitCuil: string
  especie: string
  plazo: string
  moneda: string
  cantidadComprada: string
  precioPromedioCompra: string
  montoComprado: string
  cantidadVendida: string
  precioPromedioVenta: string
  montoVendido: string
  mercado: string
}

// Parser mejorado para datos tabulados con validación estricta de 12 columnas
export function parseTitulosData(rawData: string): TituloOperacion[] {
  if (!rawData.trim()) return []

  console.log("🔄 Iniciando parser mejorado de datos de títulos...")
  console.log("📄 Datos recibidos:", rawData.substring(0, 300) + "...")

  const lines = rawData.trim().split(/\r\n|\r|\n/)
  console.log(`📊 Total líneas encontradas: ${lines.length}`)

  const operaciones: TituloOperacion[] = []

  // Filtrar líneas vacías y headers
  const dataLines = lines.filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed &&
      !trimmed.includes("Denominación Cliente") &&
      !trimmed.includes("CUIT / CUIL") &&
      !trimmed.includes("Especie")
    )
  })

  console.log(`📋 Líneas de datos a procesar: ${dataLines.length}`)

  dataLines.forEach((line, index) => {
    try {
      console.log(`📋 Procesando línea ${index + 1}: "${line}"`)

      // Nuevo método: Parser específico para el formato correcto
      const operacion = parseLineWith12Columns(line, index + 1)

      if (operacion) {
        operaciones.push(operacion)
        console.log(`✅ Operación ${index + 1} procesada: ${operacion.denominacionCliente} - ${operacion.mercado}`)
      } else {
        console.warn(`⚠️ Línea ${index + 1}: No se pudo procesar correctamente`)
      }
    } catch (error) {
      console.error(`❌ Error procesando línea ${index + 1}:`, error)
      console.error(`❌ Contenido de la línea: ${line}`)
    }
  })

  console.log(`✅ Total operaciones procesadas: ${operaciones.length}`)

  // Debug: mostrar las primeras operaciones procesadas
  if (operaciones.length > 0) {
    console.log("🔍 Primeras operaciones procesadas:")
    operaciones.slice(0, 3).forEach((op, i) => {
      console.log(`${i + 1}. ${op.denominacionCliente} | ${op.cuitCuil} | ${op.especie} | ${op.mercado}`)
    })
  }

  return operaciones
}

// Parser específico para líneas con exactamente 12 columnas
function parseLineWith12Columns(line: string, lineNumber: number): TituloOperacion | null {
  // Buscar mercado al final (debe ser BYMA, MAV o MAE)
  const mercadoMatch = line.match(/(BYMA|MAV|MAE)\s*$/i)
  if (!mercadoMatch) {
    console.warn(`⚠️ Línea ${lineNumber}: No se encontró mercado válido al final`)
    return null
  }

  const mercado = mercadoMatch[1].toUpperCase()
  const dataWithoutMercado = line.replace(/(BYMA|MAV|MAE)\s*$/i, "").trim()

  // Buscar CUIT (formato científico como 3,07E+10 o numérico largo)
  const cuitMatch = dataWithoutMercado.match(/(\d+,\d+E[+-]\d+|\d{8,})/i)
  if (!cuitMatch) {
    console.warn(`⚠️ Línea ${lineNumber}: No se encontró CUIT válido`)
    return null
  }

  const cuit = cuitMatch[1]
  const cuitIndex = dataWithoutMercado.indexOf(cuit)

  // Nombre del cliente es todo lo que está antes del CUIT
  const denominacionCliente = dataWithoutMercado.substring(0, cuitIndex).trim()
  if (!denominacionCliente) {
    console.warn(`⚠️ Línea ${lineNumber}: No se encontró nombre de cliente`)
    return null
  }

  // El resto está después del CUIT
  const afterCuit = dataWithoutMercado.substring(cuitIndex + cuit.length).trim()

  // Dividir por espacios, pero manteniendo juntos los números decimales
  const parts = afterCuit.split(/\s+/)

  // Necesitamos encontrar dónde termina la especie y empiezan los números
  // La especie puede contener números (como "2030", "2035"), pero los campos numéricos
  // son los últimos 7 campos antes del mercado

  if (parts.length < 7) {
    console.warn(`⚠️ Línea ${lineNumber}: Insuficientes campos después del CUIT (${parts.length}, esperados al menos 7)`)
    return null
  }

  // Los últimos 7 campos son: plazo, moneda, cantComprada, precioCompra, montoComprado, cantVendida, precioVenta, montoVendido
  // Pero algunos pueden estar vacíos, así que buscamos los últimos campos numéricos

  // Identificar los últimos campos numéricos
  const numericFields = []
  const especieParts = []

  // Recorrer desde el final hacia atrás para identificar campos numéricos
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    // Es numérico si es un número (con o sin decimales/comas)
    if (/^[\d,]+([.,]\d+)?$/.test(part) || part === "0") {
      numericFields.unshift(part)
      if (numericFields.length >= 7) break // Máximo 7 campos numéricos
    } else {
      // Si encontramos algo no numérico después de haber encontrado números,
      // el resto es parte de la especie
      especieParts.unshift(...parts.slice(0, i + 1))
      break
    }
  }

  // Si no encontramos suficientes campos numéricos, tomar lo que podamos
  if (numericFields.length < 3) {
    console.warn(`⚠️ Línea ${lineNumber}: Insuficientes campos numéricos (${numericFields.length})`)
    return null
  }

  const especie = especieParts.join(" ").trim()

  // Asignar campos con valores por defecto
  const plazo = numericFields[0] || "0"
  const moneda = "Pesos" // Por defecto, ya que no siempre viene en los datos
  const cantidadComprada = numericFields[1] || "0"
  const precioPromedioCompra = numericFields[2] || "0"
  const montoComprado = numericFields[3] || "0"
  const cantidadVendida = numericFields[4] || "0"
  const precioPromedioVenta = numericFields[5] || "0"
  const montoVendido = numericFields[6] || "0"

  // Validar que tenemos los campos mínimos
  if (!especie) {
    console.warn(`⚠️ Línea ${lineNumber}: No se pudo extraer la especie`)
    return null
  }

  const operacion: TituloOperacion = {
    denominacionCliente,
    cuitCuil: cuit,
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

  // Log para debug
  console.log(`📋 Línea ${lineNumber} parseada:`, {
    cliente: denominacionCliente,
    cuit: cuit,
    especie: especie,
    mercado: mercado,
    numericFields: numericFields.length,
  })

  return operacion
}

// Función auxiliar para limpiar y normalizar datos
function cleanField(field: string): string {
  return field?.trim().replace(/\s+/g, " ") || ""
}

// Función para detectar formato de entrada
export function detectInputFormat(rawData: string): string {
  const sample = rawData.substring(0, 500)

  if (sample.includes("\t")) {
    return "tab-separated"
  } else if (sample.match(/\s{2,}/)) {
    return "space-separated"
  } else if (sample.includes(",")) {
    return "comma-separated"
  } else {
    return "mixed"
  }
}

// Parser específico para datos copiados de Excel/tablas
export function parseFromTableCopy(rawData: string): TituloOperacion[] {
  console.log("🔄 Usando parser específico para datos de tabla...")

  const lines = rawData.trim().split(/\r\n|\r|\n/)
  const operaciones: TituloOperacion[] = []

  lines.forEach((line, index) => {
    if (!line.trim()) return

    const operacion = parseLineWith12Columns(line, index + 1)
    if (operacion) {
      operaciones.push(operacion)
    }
  })

  return operaciones
}

// Filtrar operaciones por mercado
export function filterByMercado(operaciones: TituloOperacion[], mercado: string): TituloOperacion[] {
  return operaciones.filter((op) => op.mercado === mercado)
}

// Obtener resumen por mercado
export function getMercadoSummary(operaciones: TituloOperacion[]): Record<string, number> {
  const summary = { BYMA: 0, MAV: 0, MAE: 0 }

  operaciones.forEach((op) => {
    if (summary.hasOwnProperty(op.mercado)) {
      summary[op.mercado as keyof typeof summary]++
    }
  })

  return summary
}

// Interfaz para el progreso del procesamiento
export interface ProcessingProgress {
  processed: number
  total: number
  currentBatch: number
  totalBatches: number
  currentStep: string
}

// Función para procesar datos en lotes con callback de progreso
export async function parseTitulosDataBatched(
  rawData: string,
  onProgress?: (progress: ProcessingProgress) => void,
  batchSize = 100,
): Promise<TituloOperacion[]> {
  if (!rawData.trim()) return []

  console.log("🔄 Iniciando procesamiento por lotes...")

  const lines = rawData.trim().split(/\r\n|\r|\n/)
  const dataLines = lines.filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed &&
      !trimmed.includes("Denominación Cliente") &&
      !trimmed.includes("CUIT / CUIL") &&
      !trimmed.includes("Especie")
    )
  })

  const totalLines = dataLines.length
  const totalBatches = Math.ceil(totalLines / batchSize)
  const operaciones: TituloOperacion[] = []

  console.log(`📊 Total líneas: ${totalLines}, Lotes: ${totalBatches}, Tamaño lote: ${batchSize}`)

  // Procesar en lotes
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * batchSize
    const endIndex = Math.min(startIndex + batchSize, totalLines)
    const batchLines = dataLines.slice(startIndex, endIndex)

    // Reportar progreso
    if (onProgress) {
      onProgress({
        processed: startIndex,
        total: totalLines,
        currentBatch: batchIndex + 1,
        totalBatches,
        currentStep: `Procesando lote ${batchIndex + 1} de ${totalBatches}...`,
      })
    }

    // Procesar lote actual
    const batchOperaciones = await processBatch(batchLines, startIndex)
    operaciones.push(...batchOperaciones)

    // Pausa para no bloquear la UI
    if (batchIndex < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  // Progreso final
  if (onProgress) {
    onProgress({
      processed: totalLines,
      total: totalLines,
      currentBatch: totalBatches,
      totalBatches,
      currentStep: "Procesamiento completado",
    })
  }

  console.log(`✅ Procesamiento por lotes completado: ${operaciones.length} operaciones`)
  return operaciones
}

// Procesar un lote de líneas
async function processBatch(lines: string[], startIndex: number): Promise<TituloOperacion[]> {
  const operaciones: TituloOperacion[] = []

  lines.forEach((line, index) => {
    try {
      const globalIndex = startIndex + index
      console.log(`📋 Procesando línea ${globalIndex + 1}: "${line.substring(0, 50)}..."`)

      const operacion = parseLineWith12Columns(line, globalIndex + 1)
      if (operacion) {
        operaciones.push(operacion)
      }
    } catch (error) {
      console.error(`❌ Error procesando línea ${startIndex + index + 1}:`, error)
    }
  })

  return operaciones
}
