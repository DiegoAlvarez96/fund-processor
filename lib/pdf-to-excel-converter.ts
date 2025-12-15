import * as pdfjs from "pdfjs-dist"

// Establecer el worker de PDF.js
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
}

// Convertir número argentino a float
function numArAFloat(s: string): number | null {
  s = (s || "").trim()
  if (!s) return null
  return Number.parseFloat(s.replace(/\./g, "").replace(",", "."))
}

// Patrón para números argentinos: 1.234.567,89 / 0,00 / 1.698,010
const NUM_PAT = "-?\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?|-?\\d+(?:,\\d+)?"
const ROW_RE_LB = new RegExp(
  `^(?P<cuenta>\\d{4})\\s*/\\s*(?P<sub>\\d{6,})\\s*` +
    `(?P<codigo>[#*]?[A-Z0-9]+)\\s*` +
    `(?P<moneda>Pesos|Dólar|Dolar|USD|U\\$S|Euros|Euro)\\s+` +
    `(?P<n1>${NUM_PAT})\\s+(?P<n2>${NUM_PAT})\\s+(?P<n3>${NUM_PAT})\\s+` +
    `(?P<n4>${NUM_PAT})\\s+(?P<n5>${NUM_PAT})\\s+(?P<n6>${NUM_PAT})`,
  "i",
)

// Detectar tipo de listado LB10, LB18 o DETALLE
function detectarTipoListado(textoTotal: string): string {
  const t = (textoTotal || "").toUpperCase()
  if (t.includes("LISTADO LB10")) return "LB10"
  if (t.includes("LISTADO LB18")) return "LB18"
  return "DETALLE"
}

// Extraer filas desde PDF tipo LB (CHEQUES/PAGARES)
export async function convertirPdfLB(file: File): Promise<any[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const filas: any[] = []
  let textoTotal = ""

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item: any) => item.str).join(" ")
    textoTotal += "\n" + pageText

    const lines = pageText.split("\n")
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      const up = trimmedLine.toUpperCase()
      // Saltar encabezados
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

      // Normalizar espacios
      const normalizedLine = trimmedLine.replace(/ \/ /g, "/").replace(/ \//, "/").replace(/\/ /, "/")

      // Intentar extraer con regex
      const match = normalizedLine.match(ROW_RE_LB)
      if (match?.groups) {
        const g = match.groups
        filas.push({
          "Cuenta/Subcuenta": `${g.cuenta}/${g.sub}`,
          Código: g.codigo,
          Moneda: g.moneda,
          Monto: numArAFloat(g.n1),
          "S.I.": numArAFloat(g.n2),
          "D.T.": numArAFloat(g.n3),
          "D.T. Val.": numArAFloat(g.n4),
          "D.T. Val. Prom.": numArAFloat(g.n5),
          Importe: numArAFloat(g.n6),
        })
      }
    }
  }

  if (filas.length === 0) {
    throw new Error("No se encontraron filas de detalle. Verifica que el PDF sea de texto y no un escaneo.")
  }

  return filas
}

// Extraer filas desde PDF tipo TITULOS RF
export async function convertirPdfTitulosRF(file: File): Promise<any[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const filas: any[] = []

  const HEADER_KILL_RE =
    /CAJA DE VALORES|SISTEMA DE FACTURACIÓN|LISTADO|FECHA DE EMISIÓN|LIQUIDACION|DURANTE EL MES|DEPOSITANTE|COBRO CUSTODIA|Agente Depositario|Caja de Valores/i

  function isHeaderOrFooter(text: string): boolean {
    const t = text.trim()
    return !t || HEADER_KILL_RE.test(t)
  }

  function detectBoundaries(words: any[]): number[] | null {
    const centers: { [key: string]: number } = {}

    for (const w of words) {
      if (/^$$\d$$$/.test(w.text)) {
        centers[w.text] = (w.left + w.right) / 2
      }
    }

    if (Object.keys(centers).length < 6) return null

    const xs = Object.values(centers).sort((a, b) => a - b)
    const xLeft = Math.min(...words.map((w) => w.left)) - 5
    const xRight = Math.max(...words.map((w) => w.right)) + 5

    const boundaries = [xLeft, (xLeft + xs[0]) / 2]
    for (let i = 0; i < xs.length - 1; i++) {
      boundaries.push((xs[i] + xs[i + 1]) / 2)
    }
    boundaries.push(xRight)

    return boundaries
  }

  function colForX(x: number, boundaries: number[]): number {
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (boundaries[i] <= x && x < boundaries[i + 1]) {
        return i
      }
    }
    return boundaries.length - 2
  }

  let boundaries: number[] | null = null

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    const words = textContent.items
      .filter((item: any) => item.str && item.str.trim())
      .map((item: any) => ({
        text: item.str,
        left: item.x0,
        right: item.x1,
        top: item.y0,
      }))

    if (!boundaries) {
      boundaries = detectBoundaries(words)
      if (!boundaries) {
        throw new Error("No se pudieron detectar las columnas. Verifica que el PDF contenga los números (1)-(6).")
      }
    }

    // Agrupar palabras por línea
    const lines: { [key: number]: any[] } = {}
    for (const w of words) {
      const key = Math.round(w.top * 10) / 10
      if (!lines[key]) lines[key] = []
      lines[key].push(w)
    }

    for (const key of Object.keys(lines).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b))) {
      const ws = lines[key as any].sort((a, b) => a.left - b.left)
      const textLine = ws.map((w) => w.text).join(" ")

      if (isHeaderOrFooter(textLine)) continue

      const cols: string[] = ["", "", "", "", "", "", ""]
      for (const w of ws) {
        const xc = (w.left + w.right) / 2
        const col = colForX(xc, boundaries)
        cols[col] = (cols[col] + " " + w.text).trim()
      }

      if (cols.some((c) => c)) {
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
  }

  return filas
}
