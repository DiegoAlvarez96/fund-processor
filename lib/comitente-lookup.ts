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

// Función para parsear líneas separadas por TABULACIONES (no comas)
function parseTSVLine(line: string): string[] {
  // El archivo usa tabulaciones como separador
  return line.split("\t").map((field) => field.trim())
}

// Función para cargar y parsear el archivo CSV de comitentes (SIN CACHE)
export async function loadComitenteData(): Promise<Map<string, ComitenteData>> {
  try {
    console.log("🔄 Cargando archivo de comitentes (sin cache)...")
    const response = await fetch("/data/relacion-ctte-cp.csv?" + Date.now()) // Cache busting
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

    // Mostrar header para debug (usando tabulaciones)
    const headers = parseTSVLine(lines[0])
    console.log("📋 Headers encontrados:", headers)
    console.log(`📋 Total headers: ${headers.length}`)

    const dataMap = new Map<string, ComitenteData>()

    // Procesar cada línea (saltando el header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const values = parseTSVLine(line) // Usar tabulaciones

        console.log(`📋 Línea ${i}: ${values.length} campos`, values.slice(0, 3)) // Mostrar primeros 3 campos

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
                linea: i,
                valoresCompletos: values,
              })
            }
          } else {
            console.log(`⚠️ Línea ${i}: cuenta="${cuentaKey}", cuit="${comitenteData.cuitCuil.trim()}"`)
          }
        } else {
          console.warn(`⚠️ Línea ${i + 1} tiene ${values.length} campos, esperados al menos 9`)
          console.warn(`⚠️ Contenido: ${line.substring(0, 100)}...`)
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando línea ${i + 1}:`, error)
        console.warn(`⚠️ Contenido de la línea: ${line}`)
      }
    }

    console.log(`✅ Cargados ${dataMap.size} comitentes (datos frescos)`)

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

    // Verificar específicamente si 52863 está en el mapa
    if (dataMap.has("52863")) {
      const data52863 = dataMap.get("52863")!
      console.log("✅ Comitente 52863 CONFIRMADO en el mapa:", {
        cuenta: "52863",
        nombre: data52863.comitente,
        cuit: data52863.cuitCuil,
      })
    } else {
      console.log("❌ Comitente 52863 NO está en el mapa final")
      // Mostrar todas las claves para debug
      const todasLasClaves = Array.from(dataMap.keys()).sort()
      console.log("🔍 Todas las claves en el mapa:", todasLasClaves.slice(0, 20))
    }

    return dataMap
  } catch (error) {
    console.error("❌ Error al cargar datos de comitentes:", error)
    // Retornar un Map vacío en caso de error
    return new Map<string, ComitenteData>()
  }
}

// Función para buscar CUIT por número de comitente (SIN CACHE)
export async function getCuitByComitente(numeroComitente: string): Promise<string | null> {
  try {
    const comitenteData = await loadComitenteData() // Siempre carga datos frescos
    const numeroLimpio = numeroComitente.toString().trim()

    console.log(`🔍 Buscando CUIT para comitente: "${numeroLimpio}"`)
    console.log(`📊 Total comitentes cargados: ${comitenteData.size}`)

    // Buscar exacto
    const comitente = comitenteData.get(numeroLimpio)

    if (comitente && comitente.cuitCuil) {
      console.log(`✅ CUIT encontrado para comitente ${numeroLimpio}: ${comitente.cuitCuil}`)
      return comitente.cuitCuil.trim()
    }

    // Debug adicional: mostrar todas las claves disponibles
    const todasLasClaves = Array.from(comitenteData.keys()).sort()
    console.log("🔍 Primeras 20 claves disponibles:", todasLasClaves.slice(0, 20))

    // Buscar claves que contengan el número
    const clavesConNumero = todasLasClaves.filter((key) => key.includes(numeroLimpio))
    console.log(`🔍 Claves que contienen "${numeroLimpio}":`, clavesConNumero)

    console.warn(`❌ No se encontró CUIT para comitente: "${numeroLimpio}"`)
    return null
  } catch (error) {
    console.error("❌ Error al buscar CUIT:", error)
    return null
  }
}

// Función para obtener información completa del comitente (SIN CACHE)
export async function getComitenteInfo(numeroComitente: string): Promise<ComitenteData | null> {
  try {
    const comitenteData = await loadComitenteData() // Siempre carga datos frescos
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

// Función de debug para mostrar estadísticas (SIN CACHE)
export async function debugComitenteData(): Promise<void> {
  const data = await loadComitenteData() // Siempre carga datos frescos
  console.log("🔍 DEBUG - Estadísticas de datos frescos:")
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
    console.log("🎯 Comitente 52863 encontrado:", test52863)
  } else {
    console.log("❌ Comitente 52863 NO encontrado")
  }

  // Mostrar todos los comitentes que empiecen con "528"
  const con528 = Array.from(data.keys()).filter((key) => key.startsWith("528"))
  console.log("🔍 Comitentes que empiezan con '528':", con528)

  // Mostrar las primeras 20 claves para debug
  const todasLasClaves = Array.from(data.keys()).sort()
  console.log("🔍 Primeras 20 claves:", todasLasClaves.slice(0, 20))
}
