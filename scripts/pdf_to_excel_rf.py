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
        # Fixed regex to correctly detect (1), (2), etc. using $$ $$ instead of $$ $$
        if re.fullmatch(r"$$\d$$", w["text"]):
            centers[w["text"]] = (w["x0"] + w["x1"]) / 2

    if len(centers) < 6:
        return None

    xs = sorted(centers.values())
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

        for page in pdf.pages:
            words = page.extract_words(x_tolerance=2, y_tolerance=2)

            if boundaries is None:
                boundaries = detect_boundaries(words)
                if boundaries is None:
                    raise ValueError(
                        "No se pudieron detectar las columnas (1)-(6)"
                    )

            lines = {}
            for w in words:
                key = round(w["top"], 1)
                lines.setdefault(key, []).append(w)

            for _, ws in sorted(lines.items()):
                ws = sorted(ws, key=lambda x: x["x0"])
                text_line = " ".join(w["text"] for w in ws)

                if is_header_or_footer(text_line):
                    continue

                cols = [""] * 7
                for w in ws:
                    xc = (w["x0"] + w["x1"]) / 2
                    col = col_for_x(xc, boundaries)
                    cols[col] = (cols[col] + " " + w["text"]).strip()

                if any(cols):
                    rows.append({
                        "CMTE": cols[0],
                        "(1)": cols[1],
                        "(2)": cols[2],
                        "(3)": cols[3],
                        "(4)": cols[4],
                        "(5)": cols[5],
                        "(6)": cols[6],
                    })

    return rows

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    rows = convert_pdf_to_excel(pdf_path)
    print(json.dumps(rows, indent=2, default=str))
