import * as XLSX from "xlsx"
import type { TituloOperacion } from "./titulos-parser"
import { MERCADO_CONFIG, EXCEL_HEADER_INFO } from "./titulos-config"

// Generar archivo Excel para un mercado específico
export function generateTitulosExcel(operaciones: TituloOperacion[], mercado: string): Blob {
  console.log(`📊 Generando Excel para ${mercado} con ${operaciones.length} operaciones`)

  const config = MERCADO_CONFIG[mercado]
  if (!config) {
    throw new Error(`Configuración no encontrada para mercado: ${mercado}`)
  }

  // Crear workbook
  const wb = XLSX.utils.book_new()

  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet([])

  // Información fija en A1:B6
  const fechaActual = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  // Establecer valores fijos
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      [EXCEL_HEADER_INFO.A1, ""], // A1
      [EXCEL_HEADER_INFO.A2, config.agenteCNV], // A2, B2
      [EXCEL_HEADER_INFO.A3, config.agente], // A3, B3
      [EXCEL_HEADER_INFO.A4, EXCEL_HEADER_INFO.B4], // A4, B4
      [EXCEL_HEADER_INFO.A5, fechaActual], // A5, B5
      ["", ""], // A6, B6 (vacía)
    ],
    { origin: "A1" },
  )

  // Headers de datos desde fila 6
  const headers = [
    "Denominación Cliente",
    "Nº CUIT / CUIL / CIE/ CDI",
    "Especie",
    "Plazo",
    "Moneda",
    "Cantidad Comprada",
    "Precio Promedio Compra",
    "Monto Comprado",
    "Cantidad Vendida",
    "Precio Promedio Venta",
    "Monto Vendido",
    "Mercado",
  ]

  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A6" })

  // Datos desde fila 7
  const data = operaciones.map((op) => [
    op.denominacionCliente,
    op.cuitCuil,
    op.especie,
    op.plazo,
    op.moneda,
    op.cantidadComprada,
    op.precioPromedioCompra,
    op.montoComprado,
    op.cantidadVendida,
    op.precioPromedioVenta,
    op.montoVendido,
    op.mercado,
  ])

  XLSX.utils.sheet_add_aoa(ws, data, { origin: "A7" })

  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 30 }, // Denominación Cliente
    { wch: 15 }, // CUIT
    { wch: 40 }, // Especie
    { wch: 8 }, // Plazo
    { wch: 20 }, // Moneda
    { wch: 12 }, // Cantidad Comprada
    { wch: 15 }, // Precio Promedio Compra
    { wch: 15 }, // Monto Comprado
    { wch: 12 }, // Cantidad Vendida
    { wch: 15 }, // Precio Promedio Venta
    { wch: 15 }, // Monto Vendido
    { wch: 10 }, // Mercado
  ]

  ws["!cols"] = colWidths

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, mercado)

  // Generar archivo
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  console.log(`✅ Excel generado para ${mercado}: ${blob.size} bytes`)
  return blob
}

// Generar todos los archivos Excel
export function generateAllTitulosExcel(operaciones: TituloOperacion[]): Record<string, Blob> {
  const files: Record<string, Blob> = {}

  Object.keys(MERCADO_CONFIG).forEach((mercado) => {
    const operacionesMercado = operaciones.filter((op) => op.mercado === mercado)
    if (operacionesMercado.length > 0) {
      files[mercado] = generateTitulosExcel(operacionesMercado, mercado)
    }
  })

  return files
}

// Obtener nombre de archivo para un mercado
export function getFileName(mercado: string): string {
  const config = MERCADO_CONFIG[mercado]
  if (!config) return `${mercado}.xlsx`

  const fecha = new Date()
    .toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "")

  return config.nombreArchivo(fecha)
}
