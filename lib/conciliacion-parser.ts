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

    // Convertir formato "Jun 27 2025 12:00AM"
    const fecha = new Date(fechaStr)
    if (isNaN(fecha.getTime())) {
      console.warn(`Fecha no válida: ${fechaStr}`)
      return fechaStr
    }

    const dia = fecha.getDate().toString().padStart(2, "0")
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0")
    const año = fecha.getFullYear()

    return `${dia}/${mes}/${año}`
  } catch (error) {
    console.error(`Error convirtiendo fecha: ${fechaStr}`, error)
    return fechaStr
  }
}

// Función para convertir importe de texto a número
function convertirImporte(importeStr: string): number {
  if (!importeStr) return 0

  // Remover símbolos de moneda y espacios
  let limpio = importeStr.toString().replace(/[$\s]/g, "").replace(/,/g, "")

  // Si tiene punto como separador decimal, convertir
  if (limpio.includes(".")) {
    limpio = limpio.replace(".", ",")
  }

  return Number.parseFloat(limpio.replace(",", ".")) || 0
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

        // Buscar header y procesar datos
        let headerRow = -1
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
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
          headerRow = 0
        }

        const headers = jsonData[headerRow] || []

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
              fechaConcertacion: convertirFecha(row[0]?.toString() || ""),
              comitenteNumero: row[1]?.toString() || "",
              comitenteDescripcion: row[2]?.toString() || "",
              moneda: row[3]?.toString() || "",
              importe: convertirImporte(row[4]?.toString() || "0"),
              cuit: limpiarCuit(row[5]?.toString() || ""),
              estado: row[6]?.toString() || "",
              datosOriginales,
            }

            if (statusOrden.comitenteNumero) {
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
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
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

        if (headerRow === -1) headerRow = 0
        const headers = jsonData[headerRow] || []

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
              fecha: convertirFecha(row[0]?.toString() || ""),
              estado: row[1]?.toString() || "",
              comitenteNumero: row[2]?.toString() || "",
              comitenteDenominacion: row[3]?.toString() || "",
              monedaDescripcion: row[4]?.toString() || "",
              importe: convertirImporte(row[5]?.toString() || "0"),
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
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
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

        if (headerRow === -1) headerRow = 0
        const headers = jsonData[headerRow] || []

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
              fechaLiquidacion: convertirFecha(row[0]?.toString() || ""),
              comitenteDenominacion: row[1]?.toString() || "",
              comitenteNumero: row[2]?.toString() || "",
              importe: convertirImporte(row[3]?.toString() || "0"),
              cuit: limpiarCuit(row[4]?.toString() || ""),
              conciliadoSolicitudes: false,
              conciliadoMovimientos: false,
              datosOriginales,
            }

            if (recibo.comitenteNumero) {
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

        // Buscar header
        let headerRow = -1
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i]
          if (
            row &&
            row.some(
              (cell) =>
                cell?.toString().toLowerCase().includes("fecha") ||
                cell?.toString().toLowerCase().includes("beneficiario"),
            )
          ) {
            headerRow = i
            break
          }
        }

        if (headerRow === -1) headerRow = 0
        const headers = jsonData[headerRow] || []

        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          try {
            const fecha = convertirFecha(row[0]?.toString() || "")
            const beneficiario = row[1]?.toString() || ""
            const dc = row[2]?.toString().toUpperCase() || ""
            const importe = convertirImporte(row[3]?.toString() || "0")
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
