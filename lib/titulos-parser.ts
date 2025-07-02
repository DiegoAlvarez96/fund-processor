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

// Parser mejorado para datos tabulados
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

      // Intentar diferentes métodos de parsing
      let parts: string[] = []

      // Método 1: Dividir por múltiples espacios (2 o más)
      parts = line
        .trim()
        .split(/\s{2,}/)
        .filter((part) => part.trim())

      // Método 2: Si no funciona, dividir por tabulaciones
      if (parts.length < 12) {
        parts = line
          .trim()
          .split(/\t+/)
          .filter((part) => part.trim())
      }

      // Método 3: Si aún no funciona, usar regex más avanzado
      if (parts.length < 12) {
        // Buscar patrones específicos: nombre, CUIT (formato científico), especie, etc.
        const regex =
          /([A-ZÁÉÍÓÚÑ\s,]+?)\s+([\d,]+E[+-]\d+|\d{8,})\s+(.+?)\s+(\d+)\s+([\w\s()]+?)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)?\s*([\d,]+)?\s*([\d,]+)?\s*(BYMA|MAV|MAE)$/i
        const match = line.match(regex)

        if (match) {
          parts = match.slice(1) // Remover el match completo
        }
      }

      // Método 4: Parsing manual para casos específicos
      if (parts.length < 12) {
        // Buscar mercado al final
        const mercadoMatch = line.match(/(BYMA|MAV|MAE)\s*$/i)
        if (mercadoMatch) {
          const mercado = mercadoMatch[1]
          const restOfLine = line.replace(/(BYMA|MAV|MAE)\s*$/i, "").trim()

          // Dividir el resto de manera inteligente
          const segments = restOfLine.split(/\s+/)

          // Reconstruir partes basándose en patrones conocidos
          if (segments.length >= 8) {
            const nombre = segments
              .slice(
                0,
                segments.findIndex((s) => /^\d/.test(s) || /E[+-]\d/.test(s)),
              )
              .join(" ")
            const remainingSegments = segments.slice(segments.findIndex((s) => /^\d/.test(s) || /E[+-]\d/.test(s)))

            parts = [
              nombre,
              remainingSegments[0], // CUIT
              remainingSegments
                .slice(1, -6)
                .join(" "), // Especie (todo hasta los últimos 6 números)
              remainingSegments[remainingSegments.length - 6] || "0", // Plazo
              remainingSegments.slice(-6, -5).join(" ") || "Pesos", // Moneda
              remainingSegments[remainingSegments.length - 5] || "0", // Cantidad Comprada
              remainingSegments[remainingSegments.length - 4] || "0", // Precio Promedio Compra
              remainingSegments[remainingSegments.length - 3] || "0", // Monto Comprado
              remainingSegments[remainingSegments.length - 2] || "0", // Cantidad Vendida
              remainingSegments[remainingSegments.length - 1] || "0", // Precio Promedio Venta
              "0", // Monto Vendido (puede estar vacío)
              mercado,
            ]
          }
        }
      }

      console.log(`📋 Línea ${index + 1}: ${parts.length} campos encontrados`, parts.slice(0, 5))

      // Validar que tenemos al menos los campos mínimos
      if (parts.length >= 8) {
        // Completar campos faltantes con valores por defecto
        while (parts.length < 12) {
          parts.push("0")
        }

        const operacion: TituloOperacion = {
          denominacionCliente: parts[0]?.trim() || "",
          cuitCuil: parts[1]?.trim() || "",
          especie: parts[2]?.trim() || "",
          plazo: parts[3]?.trim() || "0",
          moneda: parts[4]?.trim() || "Pesos",
          cantidadComprada: parts[5]?.trim() || "0",
          precioPromedioCompra: parts[6]?.trim() || "0",
          montoComprado: parts[7]?.trim() || "0",
          cantidadVendida: parts[8]?.trim() || "0",
          precioPromedioVenta: parts[9]?.trim() || "0",
          montoVendido: parts[10]?.trim() || "0",
          mercado: parts[11]?.trim().toUpperCase() || "",
        }

        // Validar que tenga mercado válido
        if (["BYMA", "MAV", "MAE"].includes(operacion.mercado)) {
          operaciones.push(operacion)
          console.log(`✅ Operación ${index + 1} procesada: ${operacion.denominacionCliente} - ${operacion.mercado}`)
        } else {
          console.warn(`⚠️ Línea ${index + 1}: Mercado "${operacion.mercado}" no válido. Datos:`, operacion)
        }
      } else {
        console.warn(`⚠️ Línea ${index + 1}: Solo ${parts.length} campos encontrados, esperados al menos 8`)
        console.warn(`⚠️ Contenido: ${line}`)
        console.warn(`⚠️ Partes: ${JSON.stringify(parts)}`)
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

    // Buscar patrón: NOMBRE + CUIT + ESPECIE + ... + MERCADO
    const mercadoMatch = line.match(/(BYMA|MAV|MAE)\s*$/i)
    if (!mercadoMatch) return

    const mercado = mercadoMatch[1].toUpperCase()
    const dataWithoutMercado = line.replace(/(BYMA|MAV|MAE)\s*$/i, "").trim()

    // Buscar CUIT (formato científico o numérico)
    const cuitMatch = dataWithoutMercado.match(/(\d,\d+E[+-]\d+|\d{8,})/i)
    if (!cuitMatch) return

    const cuit = cuitMatch[1]
    const cuitIndex = dataWithoutMercado.indexOf(cuit)

    // Nombre es todo lo que está antes del CUIT
    const nombre = dataWithoutMercado.substring(0, cuitIndex).trim()

    // El resto está después del CUIT
    const afterCuit = dataWithoutMercado.substring(cuitIndex + cuit.length).trim()

    // Dividir el resto por espacios múltiples
    const remainingParts = afterCuit.split(/\s+/)

    if (remainingParts.length >= 6) {
      // Especie es todo hasta encontrar números
      let especieEndIndex = 0
      for (let i = 0; i < remainingParts.length; i++) {
        if (/^\d+([,.]?\d+)?$/.test(remainingParts[i])) {
          especieEndIndex = i
          break
        }
      }

      const especie = remainingParts.slice(0, especieEndIndex).join(" ")
      const numericParts = remainingParts.slice(especieEndIndex)

      const operacion: TituloOperacion = {
        denominacionCliente: nombre,
        cuitCuil: cuit,
        especie: especie,
        plazo: numericParts[0] || "0",
        moneda: "Pesos", // Por defecto
        cantidadComprada: numericParts[1] || "0",
        precioPromedioCompra: numericParts[2] || "0",
        montoComprado: numericParts[3] || "0",
        cantidadVendida: numericParts[4] || "0",
        precioPromedioVenta: numericParts[5] || "0",
        montoVendido: numericParts[6] || "0",
        mercado: mercado,
      }

      operaciones.push(operacion)
      console.log(`✅ Operación parseada: ${nombre} - ${mercado}`)
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

// Agregar al final del archivo las nuevas funciones para procesamiento por lotes:

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

      // Usar los métodos existentes de parsing
      let parts: string[] = []

      // Método 1: Dividir por múltiples espacios
      parts = line
        .trim()
        .split(/\s{2,}/)
        .filter((part) => part.trim())

      // Método 2: Si no funciona, dividir por tabulaciones
      if (parts.length < 12) {
        parts = line
          .trim()
          .split(/\t+/)
          .filter((part) => part.trim())
      }

      // Método 3: Parser específico para tablas
      if (parts.length < 12) {
        const tableResult = parseTableLine(line)
        if (tableResult) {
          operaciones.push(tableResult)
          return
        }
      }

      // Método 4: Parser agresivo
      if (parts.length < 12) {
        const aggressiveResult = parseAggressiveLine(line)
        if (aggressiveResult) {
          operaciones.push(aggressiveResult)
          return
        }
      }

      // Procesar con método estándar si tenemos suficientes campos
      if (parts.length >= 8) {
        while (parts.length < 12) {
          parts.push("0")
        }

        const operacion: TituloOperacion = {
          denominacionCliente: parts[0]?.trim() || "",
          cuitCuil: parts[1]?.trim() || "",
          especie: parts[2]?.trim() || "",
          plazo: parts[3]?.trim() || "0",
          moneda: parts[4]?.trim() || "Pesos",
          cantidadComprada: parts[5]?.trim() || "0",
          precioPromedioCompra: parts[6]?.trim() || "0",
          montoComprado: parts[7]?.trim() || "0",
          cantidadVendida: parts[8]?.trim() || "0",
          precioPromedioVenta: parts[9]?.trim() || "0",
          montoVendido: parts[10]?.trim() || "0",
          mercado: parts[11]?.trim().toUpperCase() || "",
        }

        if (["BYMA", "MAV", "MAE"].includes(operacion.mercado)) {
          operaciones.push(operacion)
        }
      }
    } catch (error) {
      console.error(`❌ Error procesando línea ${startIndex + index + 1}:`, error)
    }
  })

  return operaciones
}

// Parser para línea individual de tabla
function parseTableLine(line: string): TituloOperacion | null {
  const mercadoMatch = line.match(/(BYMA|MAV|MAE)\s*$/i)
  if (!mercadoMatch) return null

  const mercado = mercadoMatch[1].toUpperCase()
  const dataWithoutMercado = line.replace(/(BYMA|MAV|MAE)\s*$/i, "").trim()

  const cuitMatch = dataWithoutMercado.match(/(\d,\d+E[+-]\d+|\d{8,})/i)
  if (!cuitMatch) return null

  const cuit = cuitMatch[1]
  const cuitIndex = dataWithoutMercado.indexOf(cuit)

  const nombre = dataWithoutMercado.substring(0, cuitIndex).trim()
  const afterCuit = dataWithoutMercado.substring(cuitIndex + cuit.length).trim()
  const remainingParts = afterCuit.split(/\s+/)

  if (remainingParts.length >= 6) {
    let especieEndIndex = 0
    for (let i = 0; i < remainingParts.length; i++) {
      if (/^\d+([,.]?\d+)?$/.test(remainingParts[i])) {
        especieEndIndex = i
        break
      }
    }

    const especie = remainingParts.slice(0, especieEndIndex).join(" ")
    const numericParts = remainingParts.slice(especieEndIndex)

    return {
      denominacionCliente: nombre,
      cuitCuil: cuit,
      especie: especie,
      plazo: numericParts[0] || "0",
      moneda: "Pesos",
      cantidadComprada: numericParts[1] || "0",
      precioPromedioCompra: numericParts[2] || "0",
      montoComprado: numericParts[3] || "0",
      cantidadVendida: numericParts[4] || "0",
      precioPromedioVenta: numericParts[5] || "0",
      montoVendido: numericParts[6] || "0",
      mercado: mercado,
    }
  }

  return null
}

// Parser agresivo para línea individual
function parseAggressiveLine(line: string): TituloOperacion | null {
  const mercados = ["BYMA", "MAV", "MAE"]
  let mercadoEncontrado = ""

  for (const mercado of mercados) {
    if (line.toUpperCase().includes(mercado)) {
      mercadoEncontrado = mercado
      break
    }
  }

  if (!mercadoEncontrado) return null

  const words = line.trim().split(/\s+/)
  const nombreWords = []
  let startOfNumbers = -1

  for (let i = 0; i < words.length; i++) {
    if (/^\d/.test(words[i]) || /E[+-]\d/.test(words[i])) {
      startOfNumbers = i
      break
    }
    nombreWords.push(words[i])
  }

  if (startOfNumbers === -1 || nombreWords.length === 0) return null

  const nombre = nombreWords.join(" ")
  const numericParts = words.slice(startOfNumbers).filter((w) => w !== mercadoEncontrado)

  if (numericParts.length >= 2) {
    return {
      denominacionCliente: nombre,
      cuitCuil: numericParts[0] || "",
      especie: numericParts.slice(1, -6).join(" ") || "N/A",
      plazo: "0",
      moneda: "Pesos",
      cantidadComprada: numericParts[numericParts.length - 6] || "0",
      precioPromedioCompra: numericParts[numericParts.length - 5] || "0",
      montoComprado: numericParts[numericParts.length - 4] || "0",
      cantidadVendida: numericParts[numericParts.length - 3] || "0",
      precioPromedioVenta: numericParts[numericParts.length - 2] || "0",
      montoVendido: numericParts[numericParts.length - 1] || "0",
      mercado: mercadoEncontrado,
    }
  }

  return null
}
