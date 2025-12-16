import { type NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execFileAsync = promisify(execFile)

// Convertir número argentino a float
function numArAFloat(s: string): number | null {
  s = (s || "").trim()
  if (!s) return null
  return Number.parseFloat(s.replace(/\./g, "").replace(",", "."))
}

// Patrón para números argentinos: 1.234.567,89 / 0,00 / 1.698,010
const NUM_PAT = "-?\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?|-?\\d+(?:,\\d+)?"
const ROW_RE_LB = new RegExp(
  `^(\\d{4})\\s*\\/\\s*(\\d{6,})\\s+` +
    `([#*]?[A-Z0-9]+)\\s+` +
    `(Pesos|Dólar|Dolar|USD|U\\$S|Euros|Euro)\\s+` +
    `(${NUM_PAT})\\s+` +
    `(${NUM_PAT})\\s+` +
    `(${NUM_PAT})\\s+` +
    `(${NUM_PAT})\\s+` +
    `(${NUM_PAT})\\s+` +
    `(${NUM_PAT})`,
  "i",
)

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const buffer = Buffer.from(arrayBuffer)

  let text: string
  try {
    text = buffer.toString("utf8")
  } catch {
    text = buffer.toString("latin1")
  }

  // Extract text between stream and endstream tags
  const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g
  let match
  let extractedText = ""

  while ((match = streamPattern.exec(text)) !== null) {
    const streamContent = match[1]
    // Keep more characters including accented letters and special symbols
    const cleaned = streamContent.replace(/\0/g, " ").replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, " ")
    extractedText += cleaned + "\n"
  }

  if (!extractedText.trim()) {
    extractedText = text.replace(/\0/g, " ").replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, " ")
  }

  console.log("[v0] PDF text extracted, length:", extractedText.length)
  console.log("[v0] First 500 chars:", extractedText.substring(0, 500))
  return extractedText
}

async function convertirPdfLB(arrayBuffer: ArrayBuffer): Promise<any[]> {
  let text: string
  try {
    text = await extractTextFromPDF(arrayBuffer)
  } catch (e) {
    console.error("[v0] PDF extraction error:", e)
    throw new Error(`No se pudo procesar el PDF: ${e}`)
  }

  const filas: any[] = []

  const lines = text.split("\n")
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    const up = trimmedLine.toUpperCase()
    if (
      up.includes("CUENTA") ||
      up.includes("CODIGO") ||
      up.includes("CÓDIGO") ||
      up.includes("MONEDA") ||
      up.includes("CAJA DE VALORES")
    ) {
      continue
    }

    const match = trimmedLine.match(ROW_RE_LB)
    if (match) {
      console.log("[v0] LB row matched:", match[0])
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

  console.log("[v0] LB rows extracted:", filas.length)
  return filas
}

async function convertirPdfTitulosRF(arrayBuffer: ArrayBuffer): Promise<any[]> {
  let text: string
  try {
    text = await extractTextFromPDF(arrayBuffer)
    console.log("[v0] PDF text extracted, length:", text.length)
  } catch (e) {
    console.error("[v0] PDF extraction error:", e)
    throw new Error(`No se pudo procesar el PDF: ${e}`)
  }

  const filas: any[] = []

  const HEADER_KILL_RE =
    /CAJA DE VALORES|SISTEMA DE FACTURACIÓN|LISTADO|FECHA DE EMISIÓN|LIQUIDACION|DURANTE EL MES|DEPOSITANTE|COBRO CUSTODIA|Agente Depositario|Caja de Valores/i

  function isHeaderOrFooter(text: string): boolean {
    const t = text.trim()
    return !t || HEADER_KILL_RE.test(t)
  }

  const lines = text.split("\n")
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

  console.log("[v0] Titulos RF rows extracted:", filas.length)
  return filas
}

export async function POST(request: NextRequest) {
  let tempPdfPath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file || !type) {
      return NextResponse.json({ error: "Falta archivo o tipo de conversión" }, { status: 400 })
    }

    if (type !== "lb" && type !== "titulos") {
      return NextResponse.json({ error: "Tipo de conversión inválido" }, { status: 400 })
    }

    // Guardar archivo temporal
    const buffer = await file.arrayBuffer()
    tempPdfPath = path.join("/tmp", `${Date.now()}_${file.name}`)
    fs.writeFileSync(tempPdfPath, Buffer.from(buffer))

    const scriptName = type === "lb" ? "pdf_to_excel_lb.py" : "pdf_to_excel_rf.py"
    const scriptPath = path.join(process.cwd(), "scripts", scriptName)

    console.log("[v0] Ejecutando script:", scriptPath)

    const { stdout } = await execFileAsync("python3", [scriptPath, tempPdfPath])

    // Parse JSON output from Python script
    const filas = JSON.parse(stdout)

    console.log("[v0] Conversión completada, filas:", filas.length)

    return NextResponse.json({ filas, count: filas.length })
  } catch (error: any) {
    console.error("[v0] PDF conversion error:", error)
    return NextResponse.json({ error: error.message || "Error al procesar el PDF" }, { status: 500 })
  } finally {
    // Limpiar archivo temporal
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try {
        fs.unlinkSync(tempPdfPath)
      } catch (e) {
        console.error("[v0] Error al limpiar archivo temporal:", e)
      }
    }
  }
}
