import re
import sys
import pdfplumber
import pandas as pd


# -----------------------------
# Detectores de sección (por página)
# -----------------------------
def is_resumen_page(text: str) -> bool:
    t = (text or "").upper()
    return ("RESUMEN DE LA" in t) and ("ARANCELES APLICADOS" in t)

def is_acreencias_page(text: str) -> bool:
    t = (text or "").upper()
    return ("ACREENCIAS" in t) and ("COMISION" in t)

def is_rf_cobro_custodia_page(text: str) -> bool:
    t = (text or "").upper()
    return ("COBRO CUSTODIA" in t) and ("(" in t)  # luego validamos boundaries


# -----------------------------
# Utilidades RF (tu enfoque boundaries)
# -----------------------------
def detect_boundaries(words):
    centers = {}
    for w in words:
        if re.fullmatch(r"\(\d+\)", w["text"]):
            centers[w["text"]] = (w["x0"] + w["x1"]) / 2

    needed = [f"({i})" for i in range(1, 7)]
    if not all(k in centers for k in needed):
        return None

    xs = [centers[k] for k in needed]
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

def _group_lines(words):
    lines = {}
    for w in words:
        key = round(w["top"], 1)
        lines.setdefault(key, []).append(w)
    return [(k, sorted(ws, key=lambda x: x["x0"])) for k, ws in sorted(lines.items())]

CMTE_RE = re.compile(r"^\d{7,10}$")
NUM_TOKEN_RE = re.compile(r"^[\d\.\,]+$")

def _first_numeric_token(s: str):
    if not s:
        return ""
    for tok in s.split():
        if NUM_TOKEN_RE.match(tok):
            return tok
    return ""

def parse_rf_cobro_custodia_page(page, boundaries):
    """
    Devuelve filas por CMTE con 3 etapas:
      SALDO / DIAS_TITULO / IMPORTE para (1)..(6)
    """
    rows = []
    words = page.extract_words(x_tolerance=2, y_tolerance=2)
    for _, ws in _group_lines(words):
        # arma 7 celdas (CMTE + 6 grupos)
        cells = [""] * 7
        for w in ws:
            xc = (w["x0"] + w["x1"]) / 2
            c = max(0, min(6, col_for_x(xc, boundaries)))
            cells[c] = (cells[c] + " " + w["text"]).strip()

        first = (cells[0] or "").strip()

        # ignorar líneas vacías
        if not any(c.strip() for c in cells):
            continue

        # detectar inicio de CMTE
        # guardamos estado en atributos de función (simple, sin clase)
        if not hasattr(parse_rf_cobro_custodia_page, "_state"):
            parse_rf_cobro_custodia_page._state = {"current": None, "stage": 0}

        st = parse_rf_cobro_custodia_page._state

        if CMTE_RE.match(first):
            if st["current"] is not None:
                rows.append(st["current"])
            st["current"] = {"CMTE": first}
            st["stage"] = 0

        if st["current"] is None:
            continue

        # mapear por stage
        for i in range(1, 7):
            val = _first_numeric_token(cells[i])
            if st["stage"] == 0:
                st["current"][f"({i})_SALDO"] = val
            elif st["stage"] == 1:
                st["current"][f"({i})_DIAS_TITULO"] = val
            else:
                st["current"][f"({i})_IMPORTE"] = val

        if any(_first_numeric_token(cells[i]) for i in range(1, 7)):
            st["stage"] = min(2, st["stage"] + 1)

    return rows


# -----------------------------
# Parser RESUMEN / ARANCELES APLICADOS
# -----------------------------
ARANCEL_RE = re.compile(r"^\s*(\d{2})\s+(.+?)\s+(\d+,\d+)\s*$")
IMPORTE_RE = re.compile(r"^\s*(\d{2})\s+(\d[\d\.\,]+)\s*$")

def parse_resumen_liquidacion_page(page):
    """
    Extrae:
      - aranceles: 01  <desc>  0,17
      - importes a pagar por: 01  1.994.741,48 (si aparecen)
    """
    text = page.extract_text() or ""
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]

    out = []
    in_aranceles = False
    in_importes = False

    for ln in lines:
        u = ln.upper()

        if "ARANCELES APLICADOS" in u:
            in_aranceles = True
            in_importes = False
            continue

        if "IMPORTES A PAGAR" in u:
            in_importes = True
            in_aranceles = False
            continue

        # cortar al cambiar de sección (por si hay otros bloques)
        if "COBRO DE COMISIONES" in u or "COMISIONES POR ACREENCIAS" in u:
            in_aranceles = False
            in_importes = False

        if in_aranceles:
            m = ARANCEL_RE.match(ln)
            if m:
                cod, desc, alic = m.groups()
                out.append({
                    "tipo": "ARANCEL",
                    "codigo": cod,
                    "descripcion": desc.strip(),
                    "alicuota": alic
                })

        if in_importes:
            m = IMPORTE_RE.match(ln)
            if m:
                cod, importe = m.groups()
                out.append({
                    "tipo": "IMPORTE_A_PAGAR",
                    "codigo": cod,
                    "importe": importe
                })

    return out


# -----------------------------
# Parser ACREENCIAS (genérico, mejorable con un ejemplo)
# -----------------------------
def parse_acreencias_page(page):
    """
    Por ahora guarda líneas “útiles” crudas para no perder info.
    Después lo afinamos con regex/columnas cuando tengas 1 ejemplo.
    """
    text = page.extract_text() or ""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    out = []
    capture = False
    for ln in lines:
        u = ln.upper()
        if "COBRO DE COMISIONES POR ACREENCIAS" in u or "COMISIONES POR ACREENCIAS" in u:
            capture = True
            continue
        if capture:
            # cortar si cambia a otro bloque grande
            if "RESUMEN DE LA" in u or "COBRO CUSTODIA" in u:
                break
            out.append({"linea": ln})
    return out


# -----------------------------
# Conversión completa a XLSX multi-hoja
# -----------------------------
def convert_pdf_to_xlsx(pdf_path: str, xlsx_path: str):
    rf_rows_all = []
    resumen_rows_all = []
    acreencias_rows_all = []

    with pdfplumber.open(pdf_path) as pdf:
        boundaries = None

        # reset estado RF por corrida
        if hasattr(parse_rf_cobro_custodia_page, "_state"):
            delattr(parse_rf_cobro_custodia_page, "_state")

        for page in pdf.pages:
            text = page.extract_text() or ""

            if is_resumen_page(text):
                resumen_rows_all.extend(parse_resumen_liquidacion_page(page))
                continue

            if is_acreencias_page(text):
                acreencias_rows_all.extend(parse_acreencias_page(page))
                continue

            # RF cobro custodia (solo si detecta boundaries)
            if is_rf_cobro_custodia_page(text):
                if boundaries is None:
                    words = page.extract_words(x_tolerance=2, y_tolerance=2)
                    boundaries = detect_boundaries(words)
                if boundaries is not None:
                    rf_rows_all.extend(parse_rf_cobro_custodia_page(page, boundaries))

        # flush final RF (si quedó current)
        st = getattr(parse_rf_cobro_custodia_page, "_state", None)
        if st and st.get("current") is not None:
            rf_rows_all.append(st["current"])

    # escribir xlsx
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
        if rf_rows_all:
            pd.DataFrame(rf_rows_all).to_excel(writer, index=False, sheet_name="RF_COBRO_CUSTODIA")
        if resumen_rows_all:
            pd.DataFrame(resumen_rows_all).to_excel(writer, index=False, sheet_name="RESUMEN_LIQ")
        if acreencias_rows_all:
            pd.DataFrame(acreencias_rows_all).to_excel(writer, index=False, sheet_name="ACREENCIAS")

    if not (rf_rows_all or resumen_rows_all or acreencias_rows_all):
        raise ValueError("No se detectaron secciones RF / RESUMEN / ACREENCIAS en el PDF.")


if __name__ == "__main__":
    import json
    pdf_path = sys.argv[1]
    xlsx_path = sys.argv[2] if len(sys.argv) > 2 else (pdf_path + ".xlsx")
    convert_pdf_to_xlsx(pdf_path, xlsx_path)
    print(json.dumps({"ok": True, "xlsx_path": xlsx_path}))

