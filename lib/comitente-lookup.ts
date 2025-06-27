// Interfaz para los datos de comitentes
export interface ComitenteData {
  fechaIngreso: string
  cuentaComitente: string
  comitente: string
  tipoComitente: string
  cuotapartista: string
  esFisico: string
  estaAnulado: string
  esExtranjero: string
  cuitCuil: string
  oficial: string
  productor: string
  referido: string
  prospector: string
  esMatriz: string
  grupoArOperBurs: string
  paisNacionalidad: string
  paisResidencia: string
}

// Cache para los datos de comitentes
let comitenteCache: Map<string, ComitenteData> | null = null

// Función mejorada para parsear CSV que maneja comillas y comas dentro de campos
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

// Función para cargar y parsear el archivo CSV de comitentes
export async function loadComitenteData(): Promise<Map<string, ComitenteData>> {
  if (comitenteCache) {
    console.log(`📋 Usando cache existente con ${comitenteCache.size} comitentes`)
    return comitenteCache
  }

  try {
    console.log("🔄 Cargando archivo de comitentes...")
    const response = await fetch("/data/relacion-ctte-cp.csv")
    if (!response.ok) {
      throw new Error(`Error al cargar archivo de comitentes: ${response.status}`)
    }

    const csvText = await response.text()
    console.log(`📄 Archivo cargado, tamaño: ${csvText.length} caracteres`)

    const lines = csvText.split("\n")
    console.log(`📊 Total de líneas: ${lines.length}`)

    if (lines.length < 2) {
      throw new Error("El archivo CSV debe tener al menos un header y una línea de datos")
    }

    // Mostrar header para debug
    const headers = parseCSVLine(lines[0])
    console.log("📋 Headers encontrados:", headers)

    const dataMap = new Map<string, ComitenteData>()

    // Procesar cada línea (saltando el header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const values = parseCSVLine(line)

        if (values.length >= 9) {
          // Al menos necesitamos hasta CUIT/CUIL
          const comitenteData: ComitenteData = {
            fechaIngreso: values[0] || "",
            cuentaComitente: values[1] || "",
            comitente: values[2] || "",
            tipoComitente: values[3] || "",
            cuotapartista: values[4] || "",
            esFisico: values[5] || "",
            estaAnulado: values[6] || "",
            esExtranjero: values[7] || "",
            cuitCuil: values[8] || "",
            oficial: values[9] || "",
            productor: values[10] || "",
            referido: values[11] || "",
            prospector: values[12] || "",
            esMatriz: values[13] || "",
            grupoArOperBurs: values[14] || "",
            paisNacionalidad: values[15] || "",
            paisResidencia: values[16] || "",
          }

          // Usar el número de cuenta como clave (limpiar espacios)
          const cuentaKey = comitenteData.cuentaComitente.trim()
          if (cuentaKey && comitenteData.cuitCuil.trim()) {
            dataMap.set(cuentaKey, comitenteData)

            // Log específico para el comitente 52863
            if (cuentaKey === "52863") {
              console.log("🎯 Comitente 52863 encontrado:", {
                cuenta: cuentaKey,
                nombre: comitenteData.comitente,
                cuit: comitenteData.cuitCuil,
              })
            }
          }
        } else {
          console.warn(`⚠️ Línea ${i + 1} tiene ${values.length} campos, esperados al menos 9`)
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando línea ${i + 1}:`, error)
      }
    }

    comitenteCache = dataMap
    console.log(`✅ Cargados ${dataMap.size} comitentes en cache`)

    // Mostrar algunos ejemplos para debug
    const ejemplos = Array.from(dataMap.entries()).slice(0, 5)
    console.log(
      "📋 Primeros 5 comitentes cargados:",
      ejemplos.map(([key, data]) => ({
        cuenta: key,
        nombre: data.comitente,
        cuit: data.cuitCuil,
      })),
    )

    return dataMap
  } catch (error) {
    console.error("❌ Error al cargar datos de comitentes:", error)
    // Retornar un Map vacío en caso de error
    return new Map<string, ComitenteData>()
  }
}

// Función para buscar CUIT por número de comitente
export async function getCuitByComitente(numeroComitente: string): Promise<string | null> {
  try {
    const comitenteData = await loadComitenteData()
    const numeroLimpio = numeroComitente.toString().trim()

    console.log(`🔍 Buscando CUIT para comitente: "${numeroLimpio}"`)
    console.log(`📊 Total comitentes en cache: ${comitenteData.size}`)

    // Buscar exacto
    const comitente = comitenteData.get(numeroLimpio)

    if (comitente && comitente.cuitCuil) {
      console.log(`✅ CUIT encontrado para comitente ${numeroLimpio}: ${comitente.cuitCuil}`)
      return comitente.cuitCuil.trim()
    }

    // Si no encuentra, mostrar claves similares para debug
    const clavesSimilares = Array.from(comitenteData.keys())
      .filter((key) => key.includes(numeroLimpio) || numeroLimpio.includes(key))
      .slice(0, 5)

    if (clavesSimilares.length > 0) {
      console.log(`🔍 Claves similares encontradas:`, clavesSimilares)
    }

    // Mostrar todas las claves que empiecen con los primeros dígitos
    const prefijo = numeroLimpio.substring(0, 3)
    const conPrefijo = Array.from(comitenteData.keys())
      .filter((key) => key.startsWith(prefijo))
      .slice(0, 10)

    if (conPrefijo.length > 0) {
      console.log(`🔍 Comitentes que empiezan con "${prefijo}":`, conPrefijo)
    }

    console.warn(`❌ No se encontró CUIT para comitente: "${numeroLimpio}"`)
    return null
  } catch (error) {
    console.error("❌ Error al buscar CUIT:", error)
    return null
  }
}

// Función para obtener información completa del comitente
export async function getComitenteInfo(numeroComitente: string): Promise<ComitenteData | null> {
  try {
    const comitenteData = await loadComitenteData()
    const numeroLimpio = numeroComitente.toString().trim()
    const comitente = comitenteData.get(numeroLimpio)

    if (comitente) {
      console.log(`✅ Información encontrada para comitente ${numeroLimpio}:`, comitente.comitente)
      return comitente
    }

    console.warn(`❌ No se encontró información para comitente: "${numeroLimpio}"`)
    return null
  } catch (error) {
    console.error("❌ Error al buscar información del comitente:", error)
    return null
  }
}

// Función para limpiar el cache (útil para recargar datos)
export function clearComitenteCache(): void {
  comitenteCache = null
  console.log("🗑️ Cache de comitentes limpiado")
}

// Función de debug para mostrar estadísticas del cache
export async function debugComitenteCache(): Promise<void> {
  const data = await loadComitenteData()
  console.log("🔍 DEBUG - Estadísticas del cache:")
  console.log(`📊 Total comitentes: ${data.size}`)

  // Mostrar algunos ejemplos
  const ejemplos = Array.from(data.entries()).slice(0, 10)
  console.table(
    ejemplos.map(([key, value]) => ({
      Cuenta: key,
      Nombre: value.comitente,
      CUIT: value.cuitCuil,
    })),
  )

  // Buscar específicamente el 52863
  const test52863 = data.get("52863")
  if (test52863) {
    console.log("🎯 Comitente 52863 en cache:", test52863)
  } else {
    console.log("❌ Comitente 52863 NO encontrado en cache")
  }
}
