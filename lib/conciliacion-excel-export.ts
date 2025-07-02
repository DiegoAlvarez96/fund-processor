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

// Función para crear hoja de resumen con diseño profesional
function crearHojaResumen(resumen: ResumenConciliacion, resultado: ResultadoConciliacion): any[][] {
  const porcentajeSolicitudes = ((resumen.solicitudes.conciliados / resumen.solicitudes.cantidad) * 100).toFixed(1)
  const porcentajeRecibos = ((resumen.recibos.conciliados / resumen.recibos.cantidad) * 100).toFixed(1)
  const porcentajeMovimientos = ((resumen.movimientos.conciliados / resumen.movimientos.cantidad) * 100).toFixed(1)

  return [
    // Título principal
    ["TABLERO DE CONCILIACIÓN TR VALO", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],

    // Sección de resumen general con colores
    ["RESUMEN GENERAL", "", "", "ANÁLISIS COMPARATIVO", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],

    // Headers con estilo
    ["Tipo de Archivo", "Cantidad", "Importe Total", "Conciliados", "No Conciliados", "% Éxito", "", ""],

    // Datos de solicitudes
    [
      "Solicitudes de Pago",
      resumen.solicitudes.cantidad,
      formatearNumero(resumen.solicitudes.importeTotal),
      resumen.solicitudes.conciliados,
      resumen.solicitudes.noConciliados,
      `${porcentajeSolicitudes}%`,
      "",
      "",
    ],

    // Datos de recibos
    [
      "Recibos de Pago",
      resumen.recibos.cantidad,
      formatearNumero(resumen.recibos.importeTotal),
      resumen.recibos.conciliados,
      resumen.recibos.noConciliados,
      `${porcentajeRecibos}%`,
      "",
      "",
    ],

    // Datos de movimientos
    [
      "Movimientos Bancarios",
      resumen.movimientos.cantidad,
      formatearNumero(resumen.movimientos.importeTotal),
      resumen.movimientos.conciliados,
      resumen.movimientos.noConciliados,
      `${porcentajeMovimientos}%`,
      "",
      "",
    ],

    ["", "", "", "", "", "", "", ""],

    // Sección de diferencias
    ["ANÁLISIS DE DIFERENCIAS", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["Comparación", "Dif. Cantidad", "Dif. Importe", "Estado", "", "", "", ""],

    [
      "Solicitudes vs Recibos",
      resumen.diferencias.solicitudesVsRecibos.cantidad,
      formatearNumero(resumen.diferencias.solicitudesVsRecibos.importe),
      resumen.diferencias.solicitudesVsRecibos.cantidad === 0 ? "✓ Equilibrado" : "⚠ Diferencia",
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
    ],

    ["", "", "", "", "", "", "", ""],

    // Estadísticas adicionales
    ["ESTADÍSTICAS ADICIONALES", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["Concepto", "Cantidad", "Observaciones", "", "", "", "", ""],

    [
      "Transferencias Monetarias",
      resultado.transferenciasMonetarias.length,
      "CUIT: 30711610126 (No mercados)",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "Movimientos de Mercados",
      resultado.movimientosMercados.length,
      "BYMA, MAV, MAE, MATBA ROFEX",
      "",
      "",
      "",
      "",
      "",
    ],

    ["", "", "", "", "", "", "", ""],

    // Indicadores de rendimiento
    ["INDICADORES DE RENDIMIENTO", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],

    [
      "Eficiencia General",
      `${((resultado.estadisticas.conciliadosCompletos / resultado.estadisticas.totalSolicitudes) * 100).toFixed(1)}%`,
      resultado.estadisticas.conciliadosCompletos > resultado.estadisticas.noConciliados ? "✓ Excelente" : "⚠ Revisar",
      "",
      "",
      "",
      "",
      "",
    ],

    [
      "Total Procesado",
      resultado.estadisticas.totalSolicitudes +
        resultado.estadisticas.totalRecibos +
        resultado.estadisticas.totalMovimientos,
      "Registros totales",
      "",
      "",
      "",
      "",
      "",
    ],

    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    [`Generado: ${new Date().toLocaleString("es-AR")}`, "", "", "", "", "", "", ""],
    ["Sistema de Conciliación TR VALO v1.0", "", "", "", "", "", "", ""],
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

    // Crear hoja de resumen con diseño mejorado
    const hojaResumen = crearHojaResumen(resumen, resultado)
    const wsResumen = XLSX.utils.aoa_to_sheet(hojaResumen)

    // Aplicar estilos y anchos de columna a la hoja de resumen
    wsResumen["!cols"] = [
      { width: 30 }, // Tipo de Archivo
      { width: 15 }, // Cantidad
      { width: 20 }, // Importe Total
      { width: 15 }, // Conc
      { width: 15 }, // No Conc
      { width: 12 }, // % Éxito
      { width: 5 }, // Separador
      { width: 5 }, // Separador
    ]

    // Agregar colores y formato a celdas específicas
    if (!wsResumen["!merges"]) wsResumen["!merges"] = []

    // Merge del título principal
    wsResumen["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } })

    // Merge de secciones
    wsResumen["!merges"].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } })
    wsResumen["!merges"].push({ s: { r: 2, c: 3 }, e: { r: 2, c: 7 } })
    wsResumen["!merges"].push({ s: { r: 9, c: 0 }, e: { r: 9, c: 7 } })
    wsResumen["!merges"].push({ s: { r: 18, c: 0 }, e: { r: 18, c: 7 } })
    wsResumen["!merges"].push({ s: { r: 25, c: 0 }, e: { r: 25, c: 7 } })

    XLSX.utils.book_append_sheet(workbook, wsResumen, "Tablero Resumen")

    // Crear hojas de datos detallados
    const hojaSolicitudes = crearHojaSolicitudes(resultado.solicitudesPago)
    const wsSolicitudes = XLSX.utils.aoa_to_sheet(hojaSolicitudes)
    wsSolicitudes["!cols"] = [
      { width: 25 }, // ID
      { width: 12 }, // Fecha
      { width: 15 }, // Comitente Número
      { width: 40 }, // Comitente Descripción
      { width: 10 }, // Moneda
      { width: 15 }, // Importe
      { width: 15 }, // CUIT
      { width: 15 }, // Estado
      { width: 12 }, // Origen
      { width: 12 }, // Conc Recibos
      { width: 12 }, // Conc Movimientos
      { width: 20 }, // Estado General
    ]
    XLSX.utils.book_append_sheet(workbook, wsSolicitudes, "Solicitudes")

    const hojaRecibos = crearHojaRecibos(resultado.recibosPago)
    const wsRecibos = XLSX.utils.aoa_to_sheet(hojaRecibos)
    wsRecibos["!cols"] = [
      { width: 25 }, // ID
      { width: 15 }, // Fecha Liquidación
      { width: 15 }, // Comitente Número
      { width: 40 }, // Comitente Denominación
      { width: 15 }, // Importe
      { width: 15 }, // CUIT
      { width: 15 }, // Conc Solicitudes
      { width: 15 }, // Conc Movimientos
      { width: 20 }, // Estado General
    ]
    XLSX.utils.book_append_sheet(workbook, wsRecibos, "Recibos")

    const hojaMovimientos = crearHojaMovimientos(resultado.movimientosBancarios)
    const wsMovimientos = XLSX.utils.aoa_to_sheet(hojaMovimientos)
    wsMovimientos["!cols"] = [
      { width: 25 }, // ID
      { width: 12 }, // Fecha
      { width: 50 }, // Beneficiario
      { width: 15 }, // CUIT
      { width: 8 }, // D/C
      { width: 15 }, // Importe
      { width: 10 }, // Moneda
      { width: 15 }, // Conc Solicitudes
      { width: 15 }, // Conc Recibos
      { width: 20 }, // Estado General
    ]
    XLSX.utils.book_append_sheet(workbook, wsMovimientos, "Mov Valores")

    // Crear hoja de transferencias monetarias
    if (resultado.transferenciasMonetarias.length > 0) {
      const hojaTransferencias = [
        ["ID", "Fecha", "Beneficiario", "CUIT", "D/C", "Importe", "Moneda"],
        ...resultado.transferenciasMonetarias.map((t) => [
          t.id,
          t.fecha,
          t.beneficiario,
          t.cuit,
          t.dc,
          t.importe,
          t.moneda,
        ]),
      ]
      const wsTransferencias = XLSX.utils.aoa_to_sheet(hojaTransferencias)
      wsTransferencias["!cols"] = [
        { width: 25 }, // ID
        { width: 12 }, // Fecha
        { width: 50 }, // Beneficiario
        { width: 15 }, // CUIT
        { width: 8 }, // D/C
        { width: 15 }, // Importe
        { width: 10 }, // Moneda
      ]
      XLSX.utils.book_append_sheet(workbook, wsTransferencias, "Monetarias")
    }

    // Crear hoja de movimientos de mercados
    if (resultado.movimientosMercados.length > 0) {
      const hojaMercados = [
        ["ID", "Fecha", "Beneficiario", "CUIT", "D/C", "Importe", "Moneda"],
        ...resultado.movimientosMercados.map((m) => [m.id, m.fecha, m.beneficiario, m.cuit, m.dc, m.importe, m.moneda]),
      ]
      const wsMercados = XLSX.utils.aoa_to_sheet(hojaMercados)
      wsMercados["!cols"] = [
        { width: 25 }, // ID
        { width: 12 }, // Fecha
        { width: 50 }, // Beneficiario
        { width: 15 }, // CUIT
        { width: 8 }, // D/C
        { width: 15 }, // Importe
        { width: 10 }, // Moneda
      ]
      XLSX.utils.book_append_sheet(workbook, wsMercados, "Mercados")
    }

    // --- Generar archivo y disparar descarga (entorno navegador) ---
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
    const nombreArchivo = `Conciliacion_${timestamp}.xlsx`

    // Escribimos el workbook a un ArrayBuffer
    const wbArray = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    // Creamos un Blob y forzamos la descarga
    const blob = new Blob([wbArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = nombreArchivo
    link.style.display = "none"
    document.body.appendChild(link)
    link.click()

    // Limpieza
    setTimeout(() => {
      URL.revokeObjectURL(link.href)
      document.body.removeChild(link)
    }, 1000)

    console.log(`✅ Archivo Excel generado: ${nombreArchivo}`)
  } catch (error) {
    console.error("❌ Error generando archivo Excel:", error)
    throw error
  }
}

// Función para exportar a CSV
export function exportarConciliacionCSV(resultado: ResultadoConciliacion): void {
  try {
    console.log("📊 Generando archivos CSV de conciliación...")

    // Calcular resumen
    const resumen = calcularResumen(resultado)

    // Crear CSV de resumen
    const csvResumen = [
      ["Tipo", "Cantidad", "Importe Total", "Conciliados", "No Conciliados", "% Éxito"],
      [
        "Solicitudes",
        resumen.solicitudes.cantidad,
        resumen.solicitudes.importeTotal,
        resumen.solicitudes.conciliados,
        resumen.solicitudes.noConciliados,
        ((resumen.solicitudes.conciliados / resumen.solicitudes.cantidad) * 100).toFixed(1) + "%",
      ],
      [
        "Recibos",
        resumen.recibos.cantidad,
        resumen.recibos.importeTotal,
        resumen.recibos.conciliados,
        resumen.recibos.noConciliados,
        ((resumen.recibos.conciliados / resumen.recibos.cantidad) * 100).toFixed(1) + "%",
      ],
      [
        "Movimientos",
        resumen.movimientos.cantidad,
        resumen.movimientos.importeTotal,
        resumen.movimientos.conciliados,
        resumen.movimientos.noConciliados,
        ((resumen.movimientos.conciliados / resumen.movimientos.cantidad) * 100).toFixed(1) + "%",
      ],
    ]

    // Convertir a CSV y descargar
    const csvContent = csvResumen.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Resumen_Conciliacion_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log("✅ Archivo CSV de resumen generado")
  } catch (error) {
    console.error("❌ Error generando archivo CSV:", error)
    throw error
  }
}
