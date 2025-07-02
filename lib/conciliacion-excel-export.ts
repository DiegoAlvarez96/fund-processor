import * as XLSX from "xlsx"
import type { ResultadoConciliacion, ResumenConciliacion } from "./conciliacion-types"

// Función para calcular resumen de conciliación
function calcularResumen(resultado: ResultadoConciliacion): ResumenConciliacion {
  // Calcular totales de solicitudes
  const solicitudesConciliadas = resultado.solicitudesPago.filter((s) => s.conciliadoRecibos && s.conciliadoMovimientos)
  const solicitudesNoConciliadas = resultado.solicitudesPago.filter(
    (s) => !s.conciliadoRecibos || !s.conciliadoMovimientos,
  )

  // Calcular totales de recibos
  const recibosConciliados = resultado.recibosPago.filter((r) => r.conciliadoSolicitudes && r.conciliadoMovimientos)
  const recibosNoConciliados = resultado.recibosPago.filter((r) => !r.conciliadoSolicitudes || !r.conciliadoMovimientos)

  // Calcular totales de movimientos
  const movimientosConciliados = resultado.movimientosBancarios.filter(
    (m) => m.conciliadoSolicitudes && m.conciliadoRecibos,
  )
  const movimientosNoConciliados = resultado.movimientosBancarios.filter(
    (m) => !m.conciliadoSolicitudes || !m.conciliadoRecibos,
  )

  return {
    solicitudes: {
      cantidad: resultado.solicitudesPago.length,
      importeTotal: resultado.solicitudesPago.reduce((sum, s) => sum + s.importe, 0),
      conciliados: solicitudesConciliadas.length,
      noConciliados: solicitudesNoConciliadas.length,
    },
    recibos: {
      cantidad: resultado.recibosPago.length,
      importeTotal: resultado.recibosPago.reduce((sum, r) => sum + r.importe, 0),
      conciliados: recibosConciliados.length,
      noConciliados: recibosNoConciliados.length,
    },
    movimientos: {
      cantidad: resultado.movimientosBancarios.length,
      importeTotal: resultado.movimientosBancarios.reduce((sum, m) => sum + m.importe, 0),
      conciliados: movimientosConciliados.length,
      noConciliados: movimientosNoConciliados.length,
    },
    diferencias: {
      solicitudesVsRecibos: {
        cantidad: resultado.solicitudesPago.length - resultado.recibosPago.length,
        importe:
          resultado.solicitudesPago.reduce((sum, s) => sum + s.importe, 0) -
          resultado.recibosPago.reduce((sum, r) => sum + r.importe, 0),
      },
      solicitudesVsMovimientos: {
        cantidad: resultado.solicitudesPago.length - resultado.movimientosBancarios.length,
        importe:
          resultado.solicitudesPago.reduce((sum, s) => sum + s.importe, 0) -
          resultado.movimientosBancarios.reduce((sum, m) => sum + m.importe, 0),
      },
      recibosVsMovimientos: {
        cantidad: resultado.recibosPago.length - resultado.movimientosBancarios.length,
        importe:
          resultado.recibosPago.reduce((sum, r) => sum + r.importe, 0) -
          resultado.movimientosBancarios.reduce((sum, m) => sum + m.importe, 0),
      },
    },
  }
}

// Función para formatear números
function formatearNumero(numero: number): string {
  return numero.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Función para crear hoja de resumen
function crearHojaResumen(resumen: ResumenConciliacion): any[][] {
  return [
    ["TABLERO DE CONCILIACIÓN TR VALO", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    ["RESUMEN GENERAL", "", "", "", "", ""],
    ["", "Cantidad", "Importe Total", "Conciliados", "No Conciliados", "% Conciliación"],
    [
      "Solicitudes de Pago",
      resumen.solicitudes.cantidad,
      formatearNumero(resumen.solicitudes.importeTotal),
      resumen.solicitudes.conciliados,
      resumen.solicitudes.noConciliados,
      `${((resumen.solicitudes.conciliados / resumen.solicitudes.cantidad) * 100).toFixed(1)}%`,
    ],
    [
      "Recibos de Pago",
      resumen.recibos.cantidad,
      formatearNumero(resumen.recibos.importeTotal),
      resumen.recibos.conciliados,
      resumen.recibos.noConciliados,
      `${((resumen.recibos.conciliados / resumen.recibos.cantidad) * 100).toFixed(1)}%`,
    ],
    [
      "Movimientos Bancarios",
      resumen.movimientos.cantidad,
      formatearNumero(resumen.movimientos.importeTotal),
      resumen.movimientos.conciliados,
      resumen.movimientos.noConciliados,
      `${((resumen.movimientos.conciliados / resumen.movimientos.cantidad) * 100).toFixed(1)}%`,
    ],
    ["", "", "", "", "", ""],
    ["ANÁLISIS DE DIFERENCIAS", "", "", "", "", ""],
    ["", "Diferencia Cantidad", "Diferencia Importe", "", "", ""],
    [
      "Solicitudes vs Recibos",
      resumen.diferencias.solicitudesVsRecibos.cantidad,
      formatearNumero(resumen.diferencias.solicitudesVsRecibos.importe),
      "",
      "",
      "",
    ],
    [
      "Solicitudes vs Movimientos",
      resumen.diferencias.solicitudesVsMovimientos.cantidad,
      formatearNumero(resumen.diferencias.solicitudesVsMovimientos.importe),
      "",
      "",
      "",
    ],
    [
      "Recibos vs Movimientos",
      resumen.diferencias.recibosVsMovimientos.cantidad,
      formatearNumero(resumen.diferencias.recibosVsMovimientos.importe),
      "",
      "",
      "",
    ],
    ["", "", "", "", "", ""],
    ["ESTADÍSTICAS ADICIONALES", "", "", "", "", ""],
    ["Total Transferencias Monetarias", "", "", "", "", ""],
    ["Total Movimientos Mercados", "", "", "", "", ""],
    ["", "", "", "", "", ""],
    [`Generado: ${new Date().toLocaleString("es-AR")}`, "", "", "", "", ""],
  ]
}

// Función para crear hoja de solicitudes
function crearHojaSolicitudes(solicitudes: any[]): any[][] {
  const headers = [
    "ID",
    "Fecha",
    "Comitente Número",
    "Comitente Descripción",
    "Moneda",
    "Importe",
    "CUIT",
    "Estado",
    "Origen",
    "Conciliado Recibos",
    "Conciliado Movimientos",
    "Estado General",
  ]

  const filas = solicitudes.map((s) => [
    s.id,
    s.fecha,
    s.comitenteNumero,
    s.comitenteDescripcion,
    s.moneda,
    s.importe,
    s.cuit,
    s.estado,
    s.origen,
    s.conciliadoRecibos ? "SÍ" : "NO",
    s.conciliadoMovimientos ? "SÍ" : "NO",
    s.conciliadoRecibos && s.conciliadoMovimientos ? "CONCILIADO COMPLETO" : "PENDIENTE",
  ])

  return [headers, ...filas]
}

// Función para crear hoja de recibos
function crearHojaRecibos(recibos: any[]): any[][] {
  const headers = [
    "ID",
    "Fecha Liquidación",
    "Comitente Número",
    "Comitente Denominación",
    "Importe",
    "CUIT",
    "Conciliado Solicitudes",
    "Conciliado Movimientos",
    "Estado General",
  ]

  const filas = recibos.map((r) => [
    r.id,
    r.fechaLiquidacion,
    r.comitenteNumero,
    r.comitenteDenominacion,
    r.importe,
    r.cuit,
    r.conciliadoSolicitudes ? "SÍ" : "NO",
    r.conciliadoMovimientos ? "SÍ" : "NO",
    r.conciliadoSolicitudes && r.conciliadoMovimientos ? "CONCILIADO COMPLETO" : "PENDIENTE",
  ])

  return [headers, ...filas]
}

// Función para crear hoja de movimientos
function crearHojaMovimientos(movimientos: any[]): any[][] {
  const headers = [
    "ID",
    "Fecha",
    "Beneficiario",
    "CUIT",
    "D/C",
    "Importe",
    "Moneda",
    "Conciliado Solicitudes",
    "Conciliado Recibos",
    "Estado General",
  ]

  const filas = movimientos.map((m) => [
    m.id,
    m.fecha,
    m.beneficiario,
    m.cuit,
    m.dc,
    m.importe,
    m.moneda,
    m.conciliadoSolicitudes ? "SÍ" : "NO",
    m.conciliadoRecibos ? "SÍ" : "NO",
    m.conciliadoSolicitudes && m.conciliadoRecibos ? "CONCILIADO COMPLETO" : "PENDIENTE",
  ])

  return [headers, ...filas]
}

// Función principal para exportar a Excel
export function exportarConciliacionExcel(resultado: ResultadoConciliacion): void {
  try {
    console.log("📊 Generando archivo Excel de conciliación...")

    // Calcular resumen
    const resumen = calcularResumen(resultado)

    // Crear workbook
    const workbook = XLSX.utils.book_new()

    // Crear hoja de resumen
    const hojaResumen = crearHojaResumen(resumen)
    const wsResumen = XLSX.utils.aoa_to_sheet(hojaResumen)

    // Aplicar estilos a la hoja de resumen
    wsResumen["!cols"] = [{ width: 25 }, { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }]

    // Crear hojas de detalle
    const hojaSolicitudes = crearHojaSolicitudes(resultado.solicitudesPago)
    const wsSolicitudes = XLSX.utils.aoa_to_sheet(hojaSolicitudes)

    const hojaRecibos = crearHojaRecibos(resultado.recibosPago)
    const wsRecibos = XLSX.utils.aoa_to_sheet(hojaRecibos)

    const hojaMovimientos = crearHojaMovimientos(resultado.movimientosBancarios)
    const wsMovimientos = XLSX.utils.aoa_to_sheet(hojaMovimientos)

    // Agregar hojas al workbook
    XLSX.utils.book_append_sheet(workbook, wsResumen, "📊 Tablero Resumen")
    XLSX.utils.book_append_sheet(workbook, wsSolicitudes, "📋 Solicitudes Detalle")
    XLSX.utils.book_append_sheet(workbook, wsRecibos, "🧾 Recibos Detalle")
    XLSX.utils.book_append_sheet(workbook, wsMovimientos, "🏦 Movimientos Detalle")

    // Si hay transferencias monetarias, agregar hoja
    if (resultado.transferenciasMonetarias.length > 0) {
      const hojaTransferencias = resultado.transferenciasMonetarias.map((t) => [
        t.id,
        t.fecha,
        t.beneficiario,
        t.cuit,
        t.dc,
        t.importe,
        t.moneda,
      ])
      const headersTransferencias = ["ID", "Fecha", "Beneficiario", "CUIT", "D/C", "Importe", "Moneda"]
      const wsTransferencias = XLSX.utils.aoa_to_sheet([headersTransferencias, ...hojaTransferencias])
      XLSX.utils.book_append_sheet(workbook, wsTransferencias, "💰 Transferencias")
    }

    // Si hay movimientos de mercados, agregar hoja
    if (resultado.movimientosMercados.length > 0) {
      const hojaMercados = resultado.movimientosMercados.map((m) => [
        m.id,
        m.fecha,
        m.beneficiario,
        m.cuit,
        m.dc,
        m.importe,
        m.moneda,
      ])
      const headersMercados = ["ID", "Fecha", "Beneficiario", "CUIT", "D/C", "Importe", "Moneda"]
      const wsMercados = XLSX.utils.aoa_to_sheet([headersMercados, ...hojaMercados])
      XLSX.utils.book_append_sheet(workbook, wsMercados, "📈 Mercados")
    }

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const nombreArchivo = `Conciliacion_TR_VALO_${timestamp}.xlsx`

    // Serializar workbook a ArrayBuffer (modo navegador)
    const wbarray = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    // Crear Blob y disparar descarga
    const blob = new Blob([wbarray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)

    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = nombreArchivo
    anchor.click()

    // Limpieza
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    console.log(`✅ Archivo Excel generado: ${nombreArchivo}`)
  } catch (error) {
    console.error("❌ Error generando archivo Excel:", error)
    throw new Error("Error al generar el archivo Excel de conciliación")
  }
}
