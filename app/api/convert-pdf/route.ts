import { type NextRequest, NextResponse } from "next/server"
import pdfParse from "pdf-parse"

// Convertir número argentino a float
function numArAFloat(s: string): number | null {
  s = (s || "").trim()
  if (!s) return null
  return Number.parseFloat(s.replace(/\./g, "").replace(",", "."))
}

// Patrón para números argentinos: 1.234.567,89 / 0,00 / 1.698,010
const NUM_PAT = "-?\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?|-?\\d+(?:,\\d+)?"
const ROW_RE_LB = new RegExp(
  `^(\\d{4})\\s*\\/\\s*(\\d{6,})\\s*` +
    `([#*]?[A-Z0-9]+)\\s*` +
    `(Pesos|Dólar|Dolar|USD|U\\$S|Euros|Euro)\\s+` +
    `(${NUM_PAT})\\s+(${NUM_PAT})\\s+(${NUM_PAT})\\s+` +
    `(${NUM_PAT})\\s+(${NUM_PAT})\\s+(${NUM_PAT})`,
  "i",
)

async function convertirPdfLB(arrayBuffer: ArrayBuffer): Promise<any[]> {
  const buffer = Buffer.from(arrayBuffer)
  const pdf = await pdfParse(buffer)
  const filas: any[] = []

  const lines = pdf.text.split("\n")
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const up = trimmedLine.toUpperCase()
    if (
      up.startsWith("CAJA DE VALORES") ||
      up.startsWith("FECHA DE EMISIÓN") ||
      up.startsWith("FECHA DE EMISION") ||
      up.startsWith("HORA DE EMISION") ||
      up.startsWith("HORA DE EMISIÓN") ||
      up.startsWith("CLIENTE") ||
      (up.includes("CUENTA/SUBCUENTA") && (up.includes("CÓDIGO") || up.includes("CODIGO")))
    ) {
      continue
    }

    const normalizedLine = trimmedLine.replace(/ \/ /g, "/").replace(/ \//, "/").replace(/\/ /, "/")

    const match = normalizedLine.match(ROW_RE_LB)
    if (match) {
      filas.push({
        "Cuenta/Subcuenta": `${match[1]}/${match[2]}`,
        Código: match[3],
        Moneda: match[4],
        Monto: numArAFloat(match[5]),
        "S.I.": numArAFloat(match[6]),
        "D.T.": numArAFloat(match[7]),
        "D.T. Val.": numArAFloat(match[8]),
        "D.T. Val. Prom.": numArAFloat(match[9]),
        Importe: numArAFloat(match[10]),
      })
    }
  }

  return filas
}

async function convertirPdfTitulosRF(arrayBuffer: ArrayBuffer): Promise<any[]> {
  const buffer = Buffer.from(arrayBuffer)
  const pdf = await pdfParse(buffer)
  const filas: any[] = []

  const HEADER_KILL_RE =
    /CAJA DE VALORES|SISTEMA DE FACTURACIÓN|LISTADO|FECHA DE EMISIÓN|LIQUIDACION|DURANTE EL MES|DEPOSITANTE|COBRO CUSTODIA|Agente Depositario|Caja de Valores/i

  function isHeaderOrFooter(text: string): boolean {
    const t = text.trim()
    return !t || HEADER_KILL_RE.test(t)
  }

  const lines = pdf.text.split("\n")
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (isHeaderOrFooter(trimmedLine)) continue

    // Dividir por espacios múltiples o tabulaciones
    const cols = trimmedLine.split(/\s{2,}|\t/).map((c) => c.trim())

    if (cols.length > 0 && cols.some((c) => c)) {
      filas.push({
        CMTE: cols[0] || "",
        "(1)": cols[1] || "",
        "(2)": cols[2] || "",
        "(3)": cols[3] || "",
        "(4)": cols[4] || "",
        "(5)": cols[5] || "",
        "(6)": cols[6] || "",
      })
    }
  }

  return filas
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file || !type) {
      return NextResponse.json({ error: "Falta archivo o tipo de conversión" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    let filas: any[] = []

    if (type === "lb") {
      filas = await convertirPdfLB(arrayBuffer)
    } else if (type === "titulos") {
      filas = await convertirPdfTitulosRF(arrayBuffer)
    } else {
      return NextResponse.json({ error: "Tipo de conversión inválido" }, { status: 400 })
    }

    return NextResponse.json({ filas, count: filas.length })
  } catch (error: any) {
    console.error("[v0] PDF conversion error:", error)
    return NextResponse.json({ error: error.message || "Error al procesar el PDF" }, { status: 500 })
  }
}
