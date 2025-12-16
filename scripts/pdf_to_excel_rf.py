import re
import sys
import json
import pdfplumber

HEADER_KILL_RE = re.compile(
    r"CAJA DE VALORES|SISTEMA DE FACTURACIÓN|LISTADO|FECHA DE EMISIÓN|"
    r"LIQUIDACION|DURANTE EL MES|DEPOSITANTE|COBRO CUSTODIA|"
    r"Agente Depositario|Caja de Valores",
    re.IGNORECASE
)

def is_header_or_footer(text):
    t = text.strip()
    return not t or HEADER_KILL_RE.search(t)

def detect_boundaries(words):
    centers = {}

    for w in words:
        # Detecta "(1)" "(2)" ... "(6)"
        if re.fullmatch(r"\(\d+\)", w["text"]):
            centers[w["text"]] = (w["x0"] + w["x1"]) / 2
            print(f"[v0] Encontrada columna: {w['text']} en x={centers[w['text']]}",
                  file=sys.stderr)

    print(f"[v0] Columnas detectadas: {len(centers)}", file=sys.stderr)

    # Queremos al menos (1)-(6)
    needed = [f"({i})" for i in range(1, 7)]
    if not all(k in centers for k in needed):
        return None

    xs = [centers[k] for k in needed]  # en orden (1)..(6)
    x_left = min(w["x0"] for w in words) - 5
    x_right = max(w["x1"] for w in words) + 5

    boundaries = [x_left, (x_left + xs[0]) / 2]
    for a, b in zip(xs, xs[1:]):
        boundaries.append((a + b) / 2)
    boundaries.append(x_right)

    return boundaries


def col_for_x(x, boundaries):
    for i in range(len(boundaries) - 1):
        if boundaries[i] <= x < boundaries[i + 1]:
            return i
    return len(boundaries) - 2

def convert_pdf_to_excel(pdf_path: str):
    rows = []

    with pdfplumber.open(pdf_path) as pdf:
        boundaries = None

        for page_i, page in enumerate(pdf.pages, start=1):
            words = page.extract_words(x_tolerance=2, y_tolerance=2)

            # 1) Detectar boundaries (una sola vez) pero intentando en varias páginas
            if boundaries is None:
                boundaries = detect_boundaries(words)
                if boundaries is None:
                    print(f"[v0] Página {page_i}: aún no aparecen columnas (1)-(6).", file=sys.stderr)
                    continue  # importante: seguir a la próxima página

            # 2) Agrupar words por línea (por coordenada top)
            lines = {}
            for w in words:
                key = round(w["top"], 1)
                lines.setdefault(key, []).append(w)

            # 3) Convertir líneas a filas
            for _, ws in sorted(lines.items()):
                ws = sorted(ws, key=lambda x: x["x0"])
                text_line = " ".join(w["text"] for w in ws)

                if is_header_or_footer(text_line):
                    continue

                # 7 columnas: CMTE + (1) .. (6)
                cols = [""] * 7

                for w in ws:
                    xc = (w["x0"] + w["x1"]) / 2
                    col = col_for_x(xc, boundaries)

                    # asegurar rango por si col_for_x devuelve fuera
                    if col < 0:
                        col = 0
                    if col > 6:
                        col = 6

                    cols[col] = (cols[col] + " " + w["text"]).strip()

                # si la línea tiene algo, la guardamos
                if any(c.strip() for c in cols):
                    rows.append({
                        "CMTE": cols[0],
                        "(1)": cols[1],
                        "(2)": cols[2],
                        "(3)": cols[3],
                        "(4)": cols[4],
                        "(5)": cols[5],
                        "(6)": cols[6],
                    })

    if not rows:
        raise ValueError("No se extrajeron filas. ¿El PDF está escaneado o no tiene tabla con (1)-(6)?")

    return rows


if __name__ == "__main__":
    pdf_path = sys.argv[1]
    rows = convert_pdf_to_excel(pdf_path)
    print(json.dumps(rows, indent=2, default=str))


asi esta ok ?
