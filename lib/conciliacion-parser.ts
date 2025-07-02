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

// Función para limpiar CUIT (eliminar guiones)
function limpiarCuit(cuit: string): string {
  return cuit?.toString().replace(/[-\s]/g, "") || ""
}

// Función para convertir fecha de formato "Jun 27 2025 12:00AM" a "27/06/2025"
function convertirFecha(fechaStr: string): string {
  if (!fechaStr) return ""

  try {
    // Si ya está en formato DD/MM/YYYY, devolverla tal como está
    if (fechaStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      return fechaStr
    }

    // Manejar formato "Jun 27 2025 12:00AM"
    if (typeof fechaStr === "string" && fechaStr.includes(" ")) {
      const partes = fechaStr.split(" ")
      if (partes.length >= 3) {
        const mesStr = partes[0]
        const dia = partes[1]
        const año = partes[2]

        // Mapear nombres de meses
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
          return `${dia.padStart(2, "0")}/${mes}/${año}`
        }
      }
    }

    // Manejar número de serie de Excel (como 45835.69652777778)
    if (typeof fechaStr === "number" || !isNaN(Number(fechaStr))) {
      const numeroSerie = Number(fechaStr)
      // Convertir número de serie de Excel a fecha
      const fecha = new Date((numeroSerie - 25569) * 86400 * 1000)

      if (!isNaN(fecha.getTime())) {
        const dia = fecha.getDate().toString().padStart(2, "0")
        const mes = (fecha.getMonth() + 1).toString().padStart(2, "0")
        const año = fecha.getFullYear()
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

// Función para convertir importe de texto a número
function convertirImporte(importeStr: string): number {
  if (!importeStr) return 0

  // Remover símbolos de moneda y espacios
  let limpio = importeStr.toString().replace(/[$\s]/g, "")

  // Reemplazar comas por puntos para decimales
  limpio = limpio.replace(/,/g, ".")

  // Si hay múltiples puntos, el último es decimal
  const puntos = limpio.split(".")
  if (puntos.length > 2) {
    // Unir todos menos el último (miles) y mantener el último como decimal
    limpio = puntos.slice(0, -1).join("") + "." + puntos[puntos.length - 1]
  }

  return Number.parseFloat(limpio) || 0
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

// Parser para Status Órdenes de Pago
export async function parseStatusOrdenesPago(file: File): Promise<StatusOrdenPago[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const resultados: StatusOrdenPago[] = []

        // Buscar header
        let headerRow = -1
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i]
          if (
            row &&
            row.some(
              (cell) =>
                cell?.toString().toLowerCase().includes("fecha") ||
                cell?.toString().toLowerCase().includes("comitente"),
            )
          ) {
            headerRow = i
            break
          }
        }

        if (headerRow === -1) {
          console.warn("No se encontró header en Status Órdenes de Pago")
          resolve([])
          return
        }

        const headers = jsonData[headerRow] || []
        console.log("Headers Status Órdenes:", headers)

        // Buscar índices de columnas
        const colFecha = buscarColumna(headers, ["fecha de concertación", "fecha concertación", "fecha"])
        const colComitenteNum = buscarColumna(headers, ["comitente (número)", "comitente numero", "numero comitente"])
        const colComitenteDesc = buscarColumna(headers, [
          "comitente (descripción)",
          "comitente descripcion",
          "descripcion",
        ])
        const colMoneda = buscarColumna(headers, ["moneda"])
        const colImporte = buscarColumna(headers, ["importe"])
        const colCuit = buscarColumna(headers, ["cuit"])
        const colEstado = buscarColumna(headers, ["estado"])

        console.log("Índices Status Órdenes:", {
          colFecha,
          colComitenteNum,
          colComitenteDesc,
          colMoneda,
          colImporte,
          colCuit,
          colEstado,
        })

        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            // Crear objeto con datos originales
            const datosOriginales: Record<string, any> = {}
            headers.forEach((header, index) => {
              if (header && row[index] !== undefined) {
                datosOriginales[header] = row[index]
              }
            })

            const statusOrden: StatusOrdenPago = {
              fechaConcertacion: convertirFecha(colFecha >= 0 ? row[colFecha]?.toString() || "" : ""),
              comitenteNumero: colComitenteNum >= 0 ? row[colComitenteNum]?.toString() || "" : "",
              comitenteDescripcion: colComitenteDesc >= 0 ? row[colComitenteDesc]?.toString() || "" : "",
              moneda: colMoneda >= 0 ? row[colMoneda]?.toString() || "" : "",
              importe: convertirImporte(colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0"),
              cuit: limpiarCuit(colCuit >= 0 ? row[colCuit]?.toString() || "" : ""),
              estado: colEstado >= 0 ? row[colEstado]?.toString() || "" : "",
              datosOriginales,
            }

            if (statusOrden.comitenteNumero || statusOrden.cuit) {
              resultados.push(statusOrden)
            }
          } catch (error) {
            console.error(`Error procesando fila ${i} de Status Órdenes:`, error)
          }
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

        // Buscar header
        let headerRow = -1
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i]
          if (
            row &&
            row.some(
              (cell) =>
                cell?.toString().toLowerCase().includes("fecha") ||
                cell?.toString().toLowerCase().includes("comitente"),
            )
          ) {
            headerRow = i
            break
          }
        }

        if (headerRow === -1) {
          console.warn("No se encontró header en Confirmación de Solicitudes")
          resolve([])
          return
        }

        const headers = jsonData[headerRow] || []
        console.log("Headers Confirmación:", headers)

        // Buscar índices de columnas
        const colFecha = buscarColumna(headers, ["fecha"])
        const colEstado = buscarColumna(headers, ["estado"])
        const colComitenteNum = buscarColumna(headers, ["comitente (número)", "comitente numero", "numero"])
        const colComitenteDenom = buscarColumna(headers, [
          "comitente (denominación)",
          "comitente denominacion",
          "denominacion",
        ])
        const colMonedaDesc = buscarColumna(headers, ["moneda (descripción)", "moneda descripcion", "moneda"])
        const colImporte = buscarColumna(headers, ["importe"])

        console.log("Índices Confirmación:", {
          colFecha,
          colEstado,
          colComitenteNum,
          colComitenteDenom,
          colMonedaDesc,
          colImporte,
        })

        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            // Crear objeto con datos originales
            const datosOriginales: Record<string, any> = {}
            headers.forEach((header, index) => {
              if (header && row[index] !== undefined) {
                datosOriginales[header] = row[index]
              }
            })

            const confirmacion: ConfirmacionSolicitud = {
              fecha: convertirFecha(colFecha >= 0 ? row[colFecha]?.toString() || "" : ""),
              estado: colEstado >= 0 ? row[colEstado]?.toString() || "" : "",
              comitenteNumero: colComitenteNum >= 0 ? row[colComitenteNum]?.toString() || "" : "",
              comitenteDenominacion: colComitenteDenom >= 0 ? row[colComitenteDenom]?.toString() || "" : "",
              monedaDescripcion: colMonedaDesc >= 0 ? row[colMonedaDesc]?.toString() || "" : "",
              importe: convertirImporte(colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0"),
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
export async function parseRecibosPago(file: File): Promise<ReciboPago[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        const resultados: ReciboPago[] = []

        // Buscar header
        let headerRow = -1
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i]
          if (
            row &&
            row.some(
              (cell) =>
                cell?.toString().toLowerCase().includes("fecha") ||
                cell?.toString().toLowerCase().includes("comitente"),
            )
          ) {
            headerRow = i
            break
          }
        }

        if (headerRow === -1) {
          console.warn("No se encontró header en Recibos de Pago")
          resolve([])
          return
        }

        const headers = jsonData[headerRow] || []
        console.log("Headers Recibos:", headers)

        // Buscar índices de columnas
        const colFechaLiq = buscarColumna(headers, ["fecha de liquidación", "fecha liquidacion", "fecha"])
        const colComitenteDenom = buscarColumna(headers, [
          "comitente (denominación)",
          "comitente denominacion",
          "denominacion",
        ])
        const colComitenteNum = buscarColumna(headers, ["comitente (número)", "comitente numero", "numero"])
        const colImporte = buscarColumna(headers, ["importe"])
        const colCuit = buscarColumna(headers, ["cuit/cuil titular", "cuit", "cuil"])

        console.log("Índices Recibos:", {
          colFechaLiq,
          colComitenteDenom,
          colComitenteNum,
          colImporte,
          colCuit,
        })

        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            // Crear objeto con datos originales
            const datosOriginales: Record<string, any> = {}
            headers.forEach((header, index) => {
              if (header && row[index] !== undefined) {
                datosOriginales[header] = row[index]
              }
            })

            const recibo: ReciboPago = {
              id: `recibo-${Date.now()}-${i}`,
              fechaLiquidacion: convertirFecha(colFechaLiq >= 0 ? row[colFechaLiq]?.toString() || "" : ""),
              comitenteDenominacion: colComitenteDenom >= 0 ? row[colComitenteDenom]?.toString() || "" : "",
              comitenteNumero: colComitenteNum >= 0 ? row[colComitenteNum]?.toString() || "" : "",
              importe: convertirImporte(colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0"),
              cuit: limpiarCuit(colCuit >= 0 ? row[colCuit]?.toString() || "" : ""),
              conciliadoSolicitudes: false,
              conciliadoMovimientos: false,
              datosOriginales,
            }

            if (recibo.comitenteNumero || recibo.cuit) {
              resultados.push(recibo)
            }
          } catch (error) {
            console.error(`Error procesando fila ${i} de Recibos:`, error)
          }
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

// Parser para Movimientos Bancarios
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
            const importe = convertirImporte(colImporte >= 0 ? row[colImporte]?.toString() || "0" : "0")
            const cuit = extraerCuitBeneficiario(beneficiario)

            // Crear objeto con datos originales
            const datosOriginales: Record<string, any> = {}
            headers.forEach((header, index) => {
              if (header && row[index] !== undefined) {
                datosOriginales[header] = row[index]
              }
            })

            // Filtrar solo movimientos "C" para conciliación
            if (dc === "C") {
              // Desestimar CUIT 30604731018
              if (cuit === "30604731018") {
                continue
              }

              // Separar CUIT 30711610126 para transferencias monetarias
              if (cuit === "30711610126") {
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
                datosOriginales,
              })
            }

            // Para mercados, incluir tanto C como D si es BYMA
            if (beneficiario.includes("BYMA S.A. BOLSAS Y MERCADOS AR") && cuit === "30711610126") {
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
      cuit: "", // Las confirmaciones no tienen CUIT directo
      estado: confirmacion.estado,
      origen: "confirmacion",
      conciliadoRecibos: false,
      conciliadoMovimientos: false,
      datosOriginales: confirmacion.datosOriginales,
    })
  })

  return solicitudes
}

// Función para generar clave de conciliación
function generarClaveConciliacion(fecha: string, cuit: string, moneda: string, importe: number): string {
  const monedaNormalizada = moneda === "Pesos" ? "$" : moneda === "Dolar" ? "USD" : moneda
  return `${fecha}-${cuit}-${monedaNormalizada}-${importe.toFixed(2)}`
}

// Función principal de conciliación
export function realizarConciliacion(
  solicitudes: SolicitudPago[],
  recibos: ReciboPago[],
  movimientos: MovimientoBancario[],
): ResultadoConciliacion {
  console.log("🔄 Iniciando conciliación...")

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
    const clave = generarClaveConciliacion(recibo.fechaLiquidacion, recibo.cuit, "$", recibo.importe) // Asumir pesos por defecto
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

  // Realizar conciliación
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
  })

  // Conciliar recibos con movimientos
  recibos.forEach((recibo) => {
    const clave = generarClaveConciliacion(recibo.fechaLiquidacion, recibo.cuit, "$", recibo.importe)

    if (mapaMovimientos.has(clave)) {
      recibo.conciliadoMovimientos = true
      mapaMovimientos.get(clave)!.forEach((movimiento) => {
        movimiento.conciliadoRecibos = true
      })
    }
  })

  // Contar conciliados completos
  solicitudes.forEach((solicitud) => {
    if (solicitud.conciliadoRecibos && solicitud.conciliadoMovimientos) {
      conciliadosCompletos++
    }
  })

  const noConciliados = solicitudes.length + recibos.length + movimientos.length - conciliadosCompletos * 3

  console.log(`✅ Conciliación completada: ${conciliadosCompletos} completos, ${noConciliados} no conciliados`)

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
      noConciliados,
    },
  }
}
