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

// Parser mejorado para datos separados por punto y coma (;)
export function parseTitulosData(rawData: string): TituloOperacion[] {
  if (!rawData.trim()) return []

  console.log("🔄 Iniciando parser para datos separados por punto y coma...")
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

      // Nuevo método: Parser específico para formato separado por punto y coma
      const operacion = parseLineWithSemicolonSeparator(line, index + 1)

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

// Parser específico para líneas separadas por punto y coma (;)
function parseLineWithSemicolonSeparator(line: string, lineNumber: number): TituloOperacion | null {
  console.log(`🔍 Línea ${lineNumber}: Parseando con separador punto y coma: "${line}"`)

  // Dividir por punto y coma
  const parts = line.split(";").map((part) => part.trim())

  console.log(`🔍 Línea ${lineNumber}: Partes encontradas (${parts.length}):`, parts)

  // Validar que tengamos al menos los campos mínimos
  if (parts.length < 3) {
    console.warn(`⚠️ Línea ${lineNumber}: Muy pocos campos (${parts.length}), se esperan al menos 3`)
    return null
  }

  // Estructura esperada con punto y coma:
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

  const operacion: TituloOperacion = {
    denominacionCliente: parts[0] || "",
    cuitCuil: parts[1] || "",
    especie: parts[2] || "",
    plazo: parts[3] || "0",
    moneda: parts[4] || "Pesos",
    cantidadComprada: parts[5] || "0",
    precioPromedioCompra: parts[6] || "0",
    montoComprado: parts[7] || "0",
    cantidadVendida: parts[8] || "0",
    precioPromedioVenta: parts[9] || "0",
    montoVendido: parts[10] || "0",
    mercado: parts[11] || "BYMA",
  }

  // Validar campos críticos
  if (!operacion.denominacionCliente) {
    console.warn(`⚠️ Línea ${lineNumber}: Falta denominación del cliente`)
    return null
  }

  if (!operacion.cuitCuil) {
    console.warn(`⚠️ Línea ${lineNumber}: Falta CUIT/CUIL`)
    return null
  }

  // Validar mercado
  const mercadosValidos = ["BYMA", "MAV", "MAE"]
  if (!mercadosValidos.includes(operacion.mercado.toUpperCase())) {
    console.warn(`⚠️ Línea ${lineNumber}: Mercado no válido: ${operacion.mercado}`)
    // Intentar detectar mercado en otros campos
    const mercadoDetectado = detectarMercadoEnLinea(line)
    if (mercadoDetectado) {
      operacion.mercado = mercadoDetectado
    } else {
      operacion.mercado = "BYMA" // Por defecto
    }
  } else {
    operacion.mercado = operacion.mercado.toUpperCase()
  }

  // Log para debug
  console.log(`📋 Línea ${lineNumber} parseada:`, {
    cliente: operacion.denominacionCliente,
    cuit: operacion.cuitCuil,
    especie: operacion.especie,
    mercado: operacion.mercado,
    campos: parts.length,
  })

  return operacion
}

// Función auxiliar para detectar mercado en la línea completa
function detectarMercadoEnLinea(line: string): string | null {
  const mercados = ["BYMA", "MAV", "MAE"]
  const lineUpper = line.toUpperCase()

  for (const mercado of mercados) {
    if (lineUpper.includes(mercado)) {
      return mercado
    }
  }

  return null
}

// Función auxiliar para limpiar y normalizar datos
function cleanField(field: string): string {
  return field?.trim().replace(/\s+/g, " ") || ""
}

// Función para detectar formato de entrada
export function detectInputFormat(rawData: string): string {
  const sample = rawData.substring(0, 500)

  if (sample.includes(";")) {
    return "semicolon-separated"
  } else if (sample.includes("\t")) {
    return "tab-separated"
  } else if (sample.match(/\s{2,}/)) {
    return "space-separated"
  } else if (sample.includes(",")) {
    return "comma-separated"
  } else {
    return "mixed"
  }
}

// Parser específico para datos copiados de Excel/tablas con punto y coma
export function parseFromTableCopy(rawData: string): TituloOperacion[] {
  console.log("🔄 Usando parser específico para datos de tabla con punto y coma...")

  const lines = rawData.trim().split(/\r\n|\r|\n/)
  const operaciones: TituloOperacion[] = []

  lines.forEach((line, index) => {
    if (!line.trim()) return

    const operacion = parseLineWithSemicolonSeparator(line, index + 1)
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

  console.log("🔄 Iniciando procesamiento por lotes con separador punto y coma...")

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

      const operacion = parseLineWithSemicolonSeparator(line, globalIndex + 1)
      if (operacion) {
        operaciones.push(operacion)
      }
    } catch (error) {
      console.error(`❌ Error procesando línea ${startIndex + index + 1}:`, error)
    }
  })

  return operaciones
}
