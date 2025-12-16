import re
import sys
import pdfplumber

HEADER_KILL_RE = re.compile(
    r"CAJA DE VALORES|SISTEMA DE FACTURACIÓN|LISTADO|FECHA DE EMISIÓN|"
    r"LIQUIDACION|DURANTE EL MES|DEPOSITANTE|COBRO CUSTODIA|"
    r"Agente Depositario|Caja de Valores|HOJA NRO\.",
    re.IGNORECASE
)

CMTE_RE = re.compile(r"^\d{7,10}$")
NUM_TOKEN_RE = re.compile(r"^[\d\.\,]+$")  # 1.234,56 o 0,000 etc.

def is_header_or_footer(text: str) -> bool:
    t = (text or "").strip()
    return (not t) or bool(HEADER_KILL_RE.search(t))

def detect_boundaries(words):
    """
    Busca los textos "(1)".."(6)" para armar boundaries de 7 columnas:
    [CMTE] + 6 grupos.
    """
    centers = {}
    for w in words:
        if re.fullmatch(r"\(\d+\)", w["text"]):
            centers[w["text"]] = (w["x0"] + w["x1"]) / 2

    needed = [f"({i})" for i in range(1, 7)]
    if not all(k in centers for k in needed):
        return None

    xs = [centers[k] for k in needed]  # orden (1)..(6)
    x_left = min(w["x0"] for w in words) - 5
    x_right = max(w["x1"] for w in words) + 5

    boundaries = [x_left, (x_left + xs[0]) / 2]
    for a, b in zip(xs, xs[1:]):
        boundaries.append((a + b) / 2)
    boundaries.append(x_right)

    return boundaries  # len = 8 => 7 columnas

def col_for_x(x, boundaries):
    for i in range(len(boundaries) - 1):
        if boundaries[i] <= x < boundaries[i + 1]:
            return i
    return len(boundaries) - 2

def _line_to_cells(ws, boundaries):
    """
    Convierte una línea (lista de words ya ordenadas por x0)
    a 7 celdas (CMTE + 6 grupos), juntando texto por celda.
    """
    cells = [""] * 7
    for w in ws:
        xc = (w["x0"] + w["x1"]) / 2
        c = col_for_x(xc, boundaries)
        c = max(0, min(6, c))
        cells[c] = (cells[c] + " " + w["text"]).strip()
    return cells

def _first_numeric_token(s: str):
    """
    Devuelve el primer token numérico (tipo 0,000 / 1.234,56), si hay.
    """
    if not s:
        return ""
    for tok in s.split():
        if NUM_TOKEN_RE.match(tok):
            return tok
    return ""

def convert_pdf_to_excel(pdf_path: str):
    """
    Parseo para RF / LB45 / 'COBRO CUSTODIA':
    Detecta header con (1)-(6) y arma filas por CMTE con 3 líneas:
      - línea 0: SALDO INICIAL
      - línea 1: DIAS/TITULO
      - línea 2: IMPORTE
    """
    rows = []
    boundaries = None

    current = None
    stage = 0  # 0=saldo, 1=dias, 2=importe

    with pdfplumber.open(pdf_path) as pdf:
        for page_i, page in enumerate(pdf.pages, start=1):
            words = page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)

            # intentar detectar boundaries en la primera página donde aparezcan (1)-(6)
            if boundaries is None:
                boundaries = detect_boundaries(words)
                if boundaries is None:
                    continue  # todavía no llegamos a la página con el header de columnas

            # agrupar por línea (top)
            lines = {}
            for w in words:
                key = round(w["top"], 1)
                lines.setdefault(key, []).append(w)

            for _, ws in sorted(lines.items()):
                ws = sorted(ws, key=lambda x: x["x0"])
                text_line = " ".join(w["text"] for w in ws)

                if is_header_or_footer(text_line):
                    continue

                cells = _line_to_cells(ws, boundaries)

                # ¿arranca un nuevo CMTE?
                first = (cells[0] or "").strip()
                if CMTE_RE.match(first):
                    # guardar el anterior si estaba completo/usable
                    if current is not None:
                        rows.append(current)

                    current = {"CMTE": first}
                    stage = 0

                # si todavía no tenemos CMTE, ignorar
                if current is None:
                    continue

                # Mapear los 6 grupos según stage
                # Cada grupo lo guardamos como token numérico (no todo el string pegado)
                for i in range(1, 7):
                    raw = cells[i]
                    val = _first_numeric_token(raw)

                    if stage == 0:
                        current[f"({i})_SALDO"] = val
                    elif stage == 1:
                        current[f"({i})_DIAS_TITULO"] = val
                    else:
                        current[f"({i})_IMPORTE"] = val

                # avanzar stage SOLO si la línea no era un header y tenía contenido numérico
                # (evita “ruido”)
                if any(_first_numeric_token(cells[i]) for i in range(1, 7)):
                    stage = min(2, stage + 1)

        # flush final
        if current is not None:
            rows.append(current)

    if not rows:
        raise ValueError("No se extrajeron filas COBRO CUSTODIA. ¿El PDF no tiene el cuadro CMTE/(1)-(6)?")

    return rows
