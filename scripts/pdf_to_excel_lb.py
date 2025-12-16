import re
import sys
import json
import pdfplumber
import pandas as pd
from io import StringIO

# Número AR: 1.234.567,89 / 0,00 / 1.698,010
NUM_PAT = r"-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?"

# Captura filas incluso cuando vienen pegadas (sin espacios entre código y moneda)
ROW_RE = re.compile(
    rf"^(?P<cuenta>\d{{4}})\s*/\s*(?P<sub>\d{{6,}})\s*"
    rf"(?P<codigo>[#*]?[A-Z0-9]+)\s*"
    rf"(?P<moneda>Pesos|Dólar|Dolar|USD|U\$S|Euros|Euro)\s+"
    rf"(?P<n1>{NUM_PAT})\s+(?P<n2>{NUM_PAT})\s+(?P<n3>{NUM_PAT})\s+"
    rf"(?P<n4>{NUM_PAT})\s+(?P<n5>{NUM_PAT})\s+(?P<n6>{NUM_PAT})",
    re.IGNORECASE
)

def num_ar_a_float(s: str):
    s = (s or "").strip()
    if not s:
        return None
    return float(s.replace(".", "").replace(",", "."))

def extraer_filas_desde_pdf(pdf_path: str):
    filas = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            txt = page.extract_text() or ""

            for line in txt.splitlines():
                line = line.strip()
                if not line:
                    continue

                up = line.upper()
                # saltar encabezados típicos
                if up.startswith("CAJA DE VALORES"):
                    continue
                if up.startswith("FECHA DE EMISIÓN") or up.startswith("FECHA DE EMISION"):
                    continue
                if up.startswith("HORA DE EMISION") or up.startswith("HORA DE EMISIÓN"):
                    continue
                if up.startswith("CLIENTE"):
                    continue
                if "CUENTA/SUBCUENTA" in up and ("CÓDIGO" in up or "CODIGO" in up):
                    continue

                # normalizar cuenta/subcuenta
                line = line.replace(" / ", "/").replace(" /", "/").replace("/ ", "/")

                m = ROW_RE.match(line)
                if not m:
                    continue

                g = m.groupdict()
                filas.append({
                    "Cuenta/Subcuenta": f"{g['cuenta']}/{g['sub']}",
                    "Código": g["codigo"],
                    "Moneda": g["moneda"],
                    "Monto": num_ar_a_float(g["n1"]),
                    "S.I.": num_ar_a_float(g["n2"]),
                    "D.T.": num_ar_a_float(g["n3"]),
                    "D.T. Val.": num_ar_a_float(g["n4"]),
                    "D.T. Val. Prom.": num_ar_a_float(g["n5"]),
                    "Importe": num_ar_a_float(g["n6"]),
                })

    return filas

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    filas = extraer_filas_desde_pdf(pdf_path)
    print(json.dumps(filas, indent=2, default=str))
