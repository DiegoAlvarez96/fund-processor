// Configuración de bancos y sus formatos
export interface BankConfig {
  name: string
  fileExtension: "txt" | "csv"
  supportsEcheck: boolean
  supportsTransfer: boolean
  transferFormats: {
    [key: string]: {
      fields: string[]
      separator: string
      dateFormat: string
    }
  }
  echeckFormat?: {
    fields: string[]
    separator: string
    dateFormat: string
  }
}

export const BANK_CONFIGS: Record<string, BankConfig> = {
  "banco-valores": {
    name: "Banco de Valores",
    fileExtension: "txt",
    supportsEcheck: false,
    supportsTransfer: true,
    transferFormats: {
      "mismo-titular": {
        fields: ["cuentaOrigen", "cuentaDestino", "importe", "concepto", "observaciones"],
        separator: ";",
        dateFormat: "DD-MM-YYYY",
      },
      "MEP-D20": {
        fields: [
          "tipo",
          "cuentaOrigen",
          "campo3",
          "cuentaDestino",
          "cuitOrdenante",
          "campo6",
          "importe",
          "campo8",
          "campo9",
          "campo10",
          "campo11",
          "campo12",
          "campo13",
          "campo14",
          "campo15",
        ],
        separator: ";",
        dateFormat: "DD-MM-YYYY",
      },
      "MEP-GC1": {
        fields: [
          "tipo",
          "numeroOperacion",
          "cbuDestino",
          "codigoBanco",
          "cuitOrdenante",
          "nombreOrdenante",
          "importe",
          "campo8",
          "campo9",
          "campo10",
          "concepto",
          "campo12",
          "campo13",
        ],
        separator: ";",
        dateFormat: "DD-MM-YYYY",
      },
      "MEP-DL0": {
        fields: [
          "tipo",
          "numeroOperacion",
          "cbuDestino",
          "codigoBanco",
          "cuitOrdenante",
          "nombreOrdenante",
          "importe",
          "campo8",
          "campo9",
          "campo10",
          "concepto",
          "campo12",
          "campo13",
        ],
        separator: ";",
        dateFormat: "DD-MM-YYYY",
      },
    },
  },
  "banco-comafi": {
    name: "Banco Comafi",
    fileExtension: "csv",
    supportsEcheck: true,
    supportsTransfer: true,
    transferFormats: {
      "MEP-DL0": {
        fields: ["cbuOrigen", "cbuDestino", "importe", "concepto", "referencia"],
        separator: ",",
        dateFormat: "YYYY-MM-DD",
      },
      "MEP-GC1": {
        fields: ["cbuOrigen", "cbuDestino", "importe", "concepto", "referencia"],
        separator: ",",
        dateFormat: "YYYY-MM-DD",
      },
    },
    echeckFormat: {
      fields: [
        "cuitBeneficiario",
        "importe",
        "multiEcheq",
        "cantidad",
        "fechaPago",
        "caracter",
        "cruzado",
        "concepto",
        "descripcion",
      ],
      separator: ",",
      dateFormat: "DD/MM/YYYY",
    },
  },
  "banco-comercio": {
    name: "Banco de Comercio",
    fileExtension: "txt",
    supportsEcheck: true,
    supportsTransfer: false, // Solo E-checks
    transferFormats: {},
    echeckFormat: {
      fields: ["cbu", "tipoCheque", "caracter", "cuitBeneficiario", "importe", "referencia", "fechaPago", "email"],
      separator: ";",
      dateFormat: "YYYY-M-D",
    },
  },
  "banco-bind": {
    name: "Banco BIND",
    fileExtension: "csv",
    supportsEcheck: true,
    supportsTransfer: false, // Solo E-checks
    transferFormats: {},
    echeckFormat: {
      fields: [
        "cuitBeneficiario",
        "importe",
        "multiEcheq",
        "cantidad",
        "fechaPago",
        "caracter",
        "cruzado",
        "concepto",
        "descripcion",
      ],
      separator: ";",
      dateFormat: "DD/M/YYYY",
    },
  },
}

// CBUs precargados por tipo de transferencia
export const CBU_PRESETS: Record<string, Record<string, Array<{ value: string; label: string }>>> = {
  "mismo-titular": {
    "banco-valores": [
      { value: "300100000074658", label: "300100000074658 - VALO OPERATIVA PESOS SECUNDARIA" },
      { value: "300100000134934", label: "300100000134934 - VALO ACDI PESOS" },
      { value: "900100000134941", label: "900100000134941 - VALO ACDI USD" },
    ],
  },
  "MEP-D20": {
    "banco-valores": [{ value: "2250", label: "2250 - CUENTA ESPECIAL D20" }],
  },
  "MEP-DL0": {
    "banco-valores": ["2990000000002307000000", "4320001010003415620011"],
    "banco-comafi": ["0650001010000012345678", "0650001010000087654321"],
  },
  "MEP-GC1": {
    "banco-valores": ["2990000000002293790008", "2990000000015072580211"],
    "banco-comafi": ["2990000000002293790008", "0650001010000087654321"],
  },
}

// Cuentas origen disponibles
export const CUENTAS_ORIGEN = [
  { value: "300100000110343", label: "VALO OPERATIVA PESOS - 300100000110343" },
  { value: "900100000163333", label: "VALO OPERATIVA USD - 900100000163333" },
  { value: "300100000134934", label: "VALO ACDI PESOS - 300100000134934" },
  { value: "900100000134941", label: "VALO ACDI USD - 900100000134941" },
  { value: "2990000000002307000000", label: "COMAFI PESOS 23070" },
]

export const CUENTAS_ORIGEN_MISMO_TITULAR = [
  { value: "300100000110343", label: "300100000110343 - VALO OPERATIVA PESOS PRINCIPAL" },
]
