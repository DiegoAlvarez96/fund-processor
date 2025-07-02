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

// Parser para datos tabulados
export function parseTitulosData(rawData: string): TituloOperacion[] {
  if (!rawData.trim()) return []

  console.log("🔄 Iniciando parser de datos de títulos...")
  console.log("📄 Datos recibidos:", rawData.substring(0, 200) + "...")

  const lines = rawData.trim().split(/\r\n|\r|\n/)
  console.log(`📊 Total líneas encontradas: ${lines.length}`)

  const operaciones: TituloOperacion[] = []

  // Saltar la primera línea si es header
  const dataLines = lines.filter((line) => line.trim() && !line.includes("Denominación Cliente"))

  console.log(`📋 Líneas de datos a procesar: ${dataLines.length}`)

  dataLines.forEach((line, index) => {
    try {
      // Dividir por múltiples espacios o tabulaciones
      const parts = line
        .trim()
        .split(/\s{2,}|\t/)
        .filter((part) => part.trim())

      console.log(`📋 Línea ${index + 1}: ${parts.length} campos`, parts.slice(0, 3))

      if (parts.length >= 12) {
        const operacion: TituloOperacion = {
          denominacionCliente: parts[0]?.trim() || "",
          cuitCuil: parts[1]?.trim() || "",
          especie: parts[2]?.trim() || "",
          plazo: parts[3]?.trim() || "",
          moneda: parts[4]?.trim() || "",
          cantidadComprada: parts[5]?.trim() || "",
          precioPromedioCompra: parts[6]?.trim() || "",
          montoComprado: parts[7]?.trim() || "",
          cantidadVendida: parts[8]?.trim() || "",
          precioPromedioVenta: parts[9]?.trim() || "",
          montoVendido: parts[10]?.trim() || "",
          mercado: parts[11]?.trim() || "",
        }

        // Validar que tenga mercado válido
        if (["BYMA", "MAV", "MAE"].includes(operacion.mercado)) {
          operaciones.push(operacion)
          console.log(`✅ Operación ${index + 1} procesada: ${operacion.denominacionCliente} - ${operacion.mercado}`)
        } else {
          console.warn(`⚠️ Línea ${index + 1}: Mercado "${operacion.mercado}" no válido`)
        }
      } else {
        console.warn(`⚠️ Línea ${index + 1}: ${parts.length} campos, esperados al menos 12`)
      }
    } catch (error) {
      console.error(`❌ Error procesando línea ${index + 1}:`, error)
    }
  })

  console.log(`✅ Total operaciones procesadas: ${operaciones.length}`)
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
