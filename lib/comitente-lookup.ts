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

// Función para cargar y parsear el archivo CSV de comitentes
export async function loadComitenteData(): Promise<Map<string, ComitenteData>> {
  if (comitenteCache) {
    return comitenteCache
  }

  try {
    const response = await fetch("/data/relacion-ctte-cp.csv")
    if (!response.ok) {
      throw new Error(`Error al cargar archivo de comitentes: ${response.status}`)
    }

    const csvText = await response.text()
    const lines = csvText.split("\n")
    const headers = lines[0].split(",")

    const dataMap = new Map<string, ComitenteData>()

    // Procesar cada línea (saltando el header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(",")
      if (values.length >= headers.length) {
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

        // Usar el número de cuenta como clave
        if (comitenteData.cuentaComitente) {
          dataMap.set(comitenteData.cuentaComitente, comitenteData)
        }
      }
    }

    comitenteCache = dataMap
    console.log(`Cargados ${dataMap.size} comitentes en cache`)
    return dataMap
  } catch (error) {
    console.error("Error al cargar datos de comitentes:", error)
    // Retornar un Map vacío en caso de error
    return new Map<string, ComitenteData>()
  }
}

// Función para buscar CUIT por número de comitente
export async function getCuitByComitente(numeroComitente: string): Promise<string | null> {
  try {
    const comitenteData = await loadComitenteData()
    const comitente = comitenteData.get(numeroComitente.toString())

    if (comitente && comitente.cuitCuil) {
      console.log(`CUIT encontrado para comitente ${numeroComitente}: ${comitente.cuitCuil}`)
      return comitente.cuitCuil
    }

    console.warn(`No se encontró CUIT para comitente: ${numeroComitente}`)
    return null
  } catch (error) {
    console.error("Error al buscar CUIT:", error)
    return null
  }
}

// Función para obtener información completa del comitente
export async function getComitenteInfo(numeroComitente: string): Promise<ComitenteData | null> {
  try {
    const comitenteData = await loadComitenteData()
    const comitente = comitenteData.get(numeroComitente.toString())

    if (comitente) {
      console.log(`Información encontrada para comitente ${numeroComitente}:`, comitente.comitente)
      return comitente
    }

    console.warn(`No se encontró información para comitente: ${numeroComitente}`)
    return null
  } catch (error) {
    console.error("Error al buscar información del comitente:", error)
    return null
  }
}

// Función para limpiar el cache (útil para recargar datos)
export function clearComitenteCache(): void {
  comitenteCache = null
  console.log("Cache de comitentes limpiado")
}
