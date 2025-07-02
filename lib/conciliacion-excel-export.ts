import * as XLSX from "xlsx"
import type { ResultadoConciliacion, ResumenConciliacion } from "./conciliacion-types"

// Función para calcular resumen de conciliación
function calcularResumen(resultado: ResultadoConciliacion): ResumenConciliacion {
  // Calcular totales de solicitudes
  const solicitudesCompletas = resultado.solicitudesPago.filter((s) => s.tipoConciliacion === "completa")
  const solicitudesPorImporte = resultado.solicitudesPago.filter((s) => s.tipoConciliacion === "por-importe")
  const solicitudesNoConciliadas = resultado.solicitudesPago.filter((s) => s.tipoConciliacion === "no-conciliado")

  // Calcular totales de recibos
  const recibosCompletos = resultado.recibosPago.filter((r) => r.tipoConciliacion === "completa")
  const recibosPorImporte = resultado.recibosPago.filter((r) => r.tipoConciliacion === "por-importe")
  const recibosNoConciliados = resultado.recibosPago.filter((r) => r.tipoConciliacion === "no-conciliado")

  // Calcular totales de movimientos
  const movimientosCompletos = resultado.movimientosBancarios.filter((m) => m.tipoConciliacion === "completa")
  const movimientosPorImporte = resultado.movimientosBancarios.filter((m) => m.tipoConciliacion === "por-importe")
  const movimientosNoConciliados = resultado.movimientosBancarios.filter((m) => m.tipoConciliacion === "no-conciliado")

  return {
    solicitudes: {
      cantidad: resultado.solicitudesPago.length,
      importeTotal: resultado.solicitudesPago.reduce((sum, s) => sum + s.importe, 0),
      conciliados: solicitudesCompletas.length,
      conciliadosPorImporte: solicitudesPorImporte.length,
      noConciliados: solicitudesNoConciliadas.length,
    },
    recibos: {
      cantidad: resultado.recibosPago.length,
      importeTotal: resultado.recibosPago.reduce((sum, r) => sum + r.importe, 0),
      conciliados: recibosCompletos.length,
      conciliadosPorImporte: recibosPorImporte.length,
      noConciliados: recibosNoConciliados.length,
    },
    movimientos: {
      cantidad: resultado.movimientosBancarios.length,
      importeTotal: resultado.movimientosBancarios.reduce((sum, m) => sum + m.importe, 0),
      conciliados: movimientosCompletos.length,
      conciliadosPorImporte: movimientosPorImporte.length,
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

// Función para crear hoja de resumen con diseño profesional
function crearHojaResumen(resumen: ResumenConciliacion, resultado: ResultadoConciliacion): any[][] {
  const porcentajeSolicitudesCompletas = (
    (resumen.solicitudes.conciliados / resumen.solicitudes.cantidad) *
    100
  ).toFixed(1)
  const porcentajeSolicitudesPorImporte = (
    (resumen.solicitudes.conciliadosPorImporte / resumen.solicitudes.cantidad) *
    100
  ).toFixed(1)

  const porcentajeRecibosCompletos = ((resumen.recibos.conciliados / resumen.recibos.cantidad) * 100).toFixed(1)
  const porcentajeRecibosPorImporte = (
    (resumen.recibos.conciliadosPorImporte / resumen.recibos.cantidad) *
    100
  ).toFixed(1)

  const porcentajeMovimientosCompletos = (
    (resumen.movimientos.conciliados / resumen.movimientos.cantidad) *
    100
  ).toFixed(1)
  const porcentajeMovimientosPorImporte = (
    (resumen.movimientos.conciliadosPorImporte / resumen.movimientos.cantidad) *
    100
  ).toFixed(1)

  return [
    // Título principal
    ["TABLERO DE CONCILIACIÓN TR VALO", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],

    // Sección de resumen general con colores
    ["RESUMEN GENERAL", "", "", "", "ANÁLISIS COMPARATIVO", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],

    // Headers con estilo
    [
      "Tipo de Archivo",
      "Cantidad",
      "Importe Total",
      "🟢 Completos",
      "🟡 Por Importe",
      "🔴 No Conciliados",
      "% Completos",
      "% Por Importe",
      "",
    ],

    // Datos de solicitudes
    [
      "Solicitudes de Pago",
      resumen.solicitudes.cantidad,
      formatearNumero(resumen.solicitudes.importeTotal),
      resumen.solicitudes.conciliados,
      resumen.solicitudes.conciliadosPorImporte,
      resumen.solicitudes.noConciliados,
      `${porcentajeSolicitudesCompletas}%`,
      `${porcentajeSolicitudesPorImporte}%`,
      "",
    ],

    // Datos de recibos
    [
      "Recibos de Pago",
      resumen.recibos.cantidad,
      formatearNumero(resumen.recibos.importeTotal),
      resumen.recibos.conciliados,
      resumen.recibos.conciliadosPorImporte,
      resumen.recibos.noConciliados,
      `${porcentajeRecibosCompletos}%`,
      `${porcentajeRecibosPorImporte}%`,
      "",
    ],

    // Datos de movimientos
    [
      "Movimientos Bancarios",
      resumen.movimientos.cantidad,
      formatearNumero(resumen.movimientos.importeTotal),
      resumen.movimientos.conciliados,
      resumen.movimientos.conciliadosPorImporte,
      resumen.movimientos.noConciliados,
      `${porcentajeMovimientosCompletos}%`,
      `${porcentajeMovimientosPorImporte}%`,
      "",
    ],

    ["", "", "", "", "", "", "", "", ""],

    // Sección de diferencias
    ["ANÁLISIS DE DIFERENCIAS", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["Comparación", "Dif. Cantidad", "Dif. Importe", "Estado", "", "", "", "", ""],

    [
      "Solicitudes vs Recibos",
      resumen.diferencias.solicitudesVsRecibos.cantidad,
      formatearNumero(resumen.diferencias.solicitudesVsRecibos.importe),
      resumen.diferencias.solicitudesVsRecibos.cantidad === 0 ? "✓ Equilibrado" : "⚠ Diferencia",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "Solicitudes vs Movimientos",
      resumen.diferencias.solicitudesVsMovimientos.cantidad,
      formatearNumero(resumen.diferencias.solicitudesVsMovimientos.importe),
      resumen.diferencias.solicitudesVsMovimientos.cantidad === 0 ? "✓ Equilibrado" : "⚠ Diferencia",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "Recibos vs Movimientos",
      resumen.diferencias.recibosVsMovimientos.cantidad,
      formatearNumero(resumen.diferencias.recibosVsMovimientos.importe),
      resumen.diferencias.recibosVsMovimientos.cantidad === 0 ? "✓ Equilibrado" : "⚠ Diferencia",
      "",
      "",
      "",
      "",
      "",
    ],

    ["", "", "", "", "", "", "", "", ""],

    // Estadísticas adicionales
    ["ESTADÍSTICAS ADICIONALES", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["Concepto", "Cantidad", "Observaciones", "", "", "", "", "", ""],

    [
      "Transferencias Monetarias",
      resultado.transferenciasMonetarias.length,
      "CUIT: 30711610126 (No mercados)",
      "",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "Movimientos de Mercados",
      resultado.movimientosMercados.length,
      "BYMA, MAV, MATBA ROFEX, MAE",
      "",
      "",
      "",
      "",
      "",
      "",
    ],

    ["", "", "", "", "", "", "", "", ""],

    // Información del proceso
    ["INFORMACIÓN DEL PROCESO", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["Fecha de Generación:", new Date().toLocaleString("es-AR"), "", "", "", "", "", "", ""],
    ["Sistema:", "Conciliación TR VALO v2.0", "", "", "", "", "", "", ""],
    ["Proceso:", "Conciliación Completa + Por Importe", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["🟢 Verde: Conciliado completo (fecha + CUIT + moneda + importe)", "", "", "", "", "", "", "", ""],
    ["🟡 Amarillo: Conciliado por importe solamente", "", "", "", "", "", "", "", ""],
    ["🔴 Rojo: No conciliado", "", "", "", "", "", "", "", ""],
  ]
}

// Función para crear hoja de solicitudes con estado de conciliación
function crearHojaSolicitudes(solicitudes: any[]): any[][] {
  const headers = [
    "ID",
    "Fecha",
    "Comitente Número",
    "Comitente Descripción",
    "CUIT",
    "Moneda",
    "Importe",
    "Estado",
    "Origen",
    "🟢 Conciliado Recibos",
    "🟢 Conciliado Movimientos",
    "🟡 Conciliado Recibos (Importe)",
    "🟡 Conciliado Movimientos (Importe)",
    "Tipo Conciliación",
  ]

  const filas = solicitudes.map((solicitud) => [
    solicitud.id,
    solicitud.fecha,
    solicitud.comitenteNumero,
    solicitud.comitenteDescripcion,
    solicitud.cuit,
    solicitud.moneda,
    solicitud.importe,
    solicitud.estado,
    solicitud.origen,
    solicitud.conciliadoRecibos ? "SÍ" : "NO",
    solicitud.conciliadoMovimientos ? "SÍ" : "NO",
    solicitud.conciliadoRecibosPorImporte ? "SÍ" : "NO",
    solicitud.conciliadoMovimientosPorImporte ? "SÍ" : "NO",
    solicitud.tipoConciliacion === "completa"
      ? "🟢 COMPLETA"
      : solicitud.tipoConciliacion === "por-importe"
        ? "🟡 POR IMPORTE"
        : "🔴 NO CONCILIADO",
  ])

  return [headers, ...filas]
}

// Función para crear hoja de recibos con estado de conciliación
function crearHojaRecibos(recibos: any[]): any[][] {
  const headers = [
    "ID",
    "Fecha Liquidación",
    "Comitente Número",
    "Comitente Denominación",
    "CUIT",
    "Moneda",
    "Importe",
    "🟢 Conciliado Solicitudes",
    "🟢 Conciliado Movimientos",
    "🟡 Conciliado Solicitudes (Importe)",
    "🟡 Conciliado Movimientos (Importe)",
    "Tipo Conciliación",
  ]

  const filas = recibos.map((recibo) => [
    recibo.id,
    recibo.fechaLiquidacion,
    recibo.comitenteNumero,
    recibo.comitenteDenominacion,
    recibo.cuit,
    recibo.moneda || "$",
    recibo.importe,
    recibo.conciliadoSolicitudes ? "SÍ" : "NO",
    recibo.conciliadoMovimientos ? "SÍ" : "NO",
    recibo.conciliadoSolicitudesPorImporte ? "SÍ" : "NO",
    recibo.conciliadoMovimientosPorImporte ? "SÍ" : "NO",
    recibo.tipoConciliacion === "completa"
      ? "🟢 COMPLETA"
      : recibo.tipoConciliacion === "por-importe"
        ? "🟡 POR IMPORTE"
        : "🔴 NO CONCILIADO",
  ])

  return [headers, ...filas]
}

// Función para crear hoja de movimientos con estado de conciliación
function crearHojaMovimientos(movimientos: any[]): any[][] {
  const headers = [
    "ID",
    "Fecha",
    "Beneficiario",
    "CUIT",
    "D/C",
    "Moneda",
    "Importe",
    "🟢 Conciliado Solicitudes",
    "🟢 Conciliado Recibos",
    "🟡 Conciliado Solicitudes (Importe)",
    "🟡 Conciliado Recibos (Importe)",
    "Tipo Conciliación",
  ]

  const filas = movimientos.map((movimiento) => [
    movimiento.id,
    movimiento.fecha,
    movimiento.beneficiario,
    movimiento.cuit,
    movimiento.dc,
    movimiento.moneda,
    movimiento.importe,
    movimiento.conciliadoSolicitudes ? "SÍ" : "NO",
    movimiento.conciliadoRecibos ? "SÍ" : "NO",
    movimiento.conciliadoSolicitudesPorImporte ? "SÍ" : "NO",
    movimiento.conciliadoRecibosPorImporte ? "SÍ" : "NO",
    movimiento.tipoConciliacion === "completa"
      ? "🟢 COMPLETA"
      : movimiento.tipoConciliacion === "por-importe"
        ? "🟡 POR IMPORTE"
        : "🔴 NO CONCILIADO",
  ])

  return [headers, ...filas]
}

// Función para crear hoja de transferencias monetarias
function crearHojaTransferencias(transferencias: any[]): any[][] {
  const headers = ["ID", "Fecha", "Beneficiario", "CUIT", "D/C", "Moneda", "Importe"]

  const filas = transferencias.map((transferencia) => [
    transferencia.id,
    transferencia.fecha,
    transferencia.beneficiario,
    transferencia.cuit,
    transferencia.dc,
    transferencia.moneda,
    transferencia.importe,
  ])

  return [headers, ...filas]
}

// Función para crear hoja de movimientos de mercados
function crearHojaMercados(mercados: any[]): any[][] {
  const headers = ["ID", "Fecha", "Beneficiario", "CUIT", "D/C", "Moneda", "Importe"]

  const filas = mercados.map((mercado) => [
    mercado.id,
    mercado.fecha,
    mercado.beneficiario,
    mercado.cuit,
    mercado.dc,
    mercado.moneda,
    mercado.importe,
  ])

  return [headers, ...filas]
}

// Función principal para exportar a Excel
export function exportarConciliacionExcel(resultado: ResultadoConciliacion): void {
  const resumen = calcularResumen(resultado)

  // Crear libro de trabajo
  const workbook = XLSX.utils.book_new()

  // Crear hojas
  const hojaResumen = XLSX.utils.aoa_to_sheet(crearHojaResumen(resumen, resultado))
  const hojaSolicitudes = XLSX.utils.aoa_to_sheet(crearHojaSolicitudes(resultado.solicitudesPago))
  const hojaRecibos = XLSX.utils.aoa_to_sheet(crearHojaRecibos(resultado.recibosPago))
  const hojaMovimientos = XLSX.utils.aoa_to_sheet(crearHojaMovimientos(resultado.movimientosBancarios))
  const hojaTransferencias = XLSX.utils.aoa_to_sheet(crearHojaTransferencias(resultado.transferenciasMonetarias))
  const hojaMercados = XLSX.utils.aoa_to_sheet(crearHojaMercados(resultado.movimientosMercados))

  // Agregar hojas al libro
  XLSX.utils.book_append_sheet(workbook, hojaResumen, "📊 Tablero")
  XLSX.utils.book_append_sheet(workbook, hojaSolicitudes, "📋 Solicitudes")
  XLSX.utils.book_append_sheet(workbook, hojaRecibos, "🧾 Recibos")
  XLSX.utils.book_append_sheet(workbook, hojaMovimientos, "💳 Movimientos")
  XLSX.utils.book_append_sheet(workbook, hojaTransferencias, "💰 Transferencias")
  XLSX.utils.book_append_sheet(workbook, hojaMercados, "📈 Mercados")

  // Aplicar estilos básicos a la hoja de resumen
  const rangeResumen = XLSX.utils.decode_range(hojaResumen["!ref"] || "A1")

  // Configurar anchos de columna para mejor visualización
  hojaResumen["!cols"] = [
    { wch: 25 }, // Tipo de Archivo
    { wch: 12 }, // Cantidad
    { wch: 18 }, // Importe Total
    { wch: 12 }, // Completos
    { wch: 15 }, // Por Importe
    { wch: 15 }, // No Conciliados
    { wch: 12 }, // % Completos
    { wch: 15 }, // % Por Importe
    { wch: 10 }, // Extra
  ]

  // Configurar anchos para otras hojas
  hojaSolicitudes["!cols"] = [
    { wch: 20 }, // ID
    { wch: 12 }, // Fecha
    { wch: 15 }, // Comitente Número
    { wch: 30 }, // Comitente Descripción
    { wch: 15 }, // CUIT
    { wch: 8 }, // Moneda
    { wch: 15 }, // Importe
    { wch: 12 }, // Estado
    { wch: 12 }, // Origen
    { wch: 18 }, // Conciliado Recibos
    { wch: 20 }, // Conciliado Movimientos
    { wch: 25 }, // Conciliado Recibos (Importe)
    { wch: 28 }, // Conciliado Movimientos (Importe)
    { wch: 18 }, // Tipo Conciliación
  ]

  hojaRecibos["!cols"] = [
    { wch: 20 }, // ID
    { wch: 15 }, // Fecha Liquidación
    { wch: 15 }, // Comitente Número
    { wch: 30 }, // Comitente Denominación
    { wch: 15 }, // CUIT
    { wch: 8 }, // Moneda
    { wch: 15 }, // Importe
    { wch: 20 }, // Conciliado Solicitudes
    { wch: 20 }, // Conciliado Movimientos
    { wch: 28 }, // Conciliado Solicitudes (Importe)
    { wch: 28 }, // Conciliado Movimientos (Importe)
    { wch: 18 }, // Tipo Conciliación
  ]

  hojaMovimientos["!cols"] = [
    { wch: 20 }, // ID
    { wch: 12 }, // Fecha
    { wch: 40 }, // Beneficiario
    { wch: 15 }, // CUIT
    { wch: 6 }, // D/C
    { wch: 8 }, // Moneda
    { wch: 15 }, // Importe
    { wch: 20 }, // Conciliado Solicitudes
    { wch: 18 }, // Conciliado Recibos
    { wch: 28 }, // Conciliado Solicitudes (Importe)
    { wch: 25 }, // Conciliado Recibos (Importe)
    { wch: 18 }, // Tipo Conciliación
  ]

  // Generar nombre de archivo con timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "_")
  const nombreArchivo = `Conciliacion_TR_VALO_${timestamp}.xlsx`

  // Escribir archivo
  XLSX.writeFile(workbook, nombreArchivo)

  console.log(`✅ Archivo Excel exportado: ${nombreArchivo}`)
}
