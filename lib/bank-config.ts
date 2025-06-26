// Configuración de bancos y sus formatos
export interface BankConfig {
  name: string
  fileExtension: "txt" | "csv"
  supportsEcheck: boolean
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
    transferFormats: {
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
      "MEP-D20": {
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
    transferFormats: {
      "MEP-DL0": {
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
    transferFormats: {
      inmediata: {
        fields: ["cbuOrigen", "cbuDestino", "importe", "concepto"],
        separator: ";",
        dateFormat: "DD-MM-YYYY",
      },
    },
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
    transferFormats: {
      inmediata: {
        fields: ["cbuOrigen", "cbuDestino", "importe", "concepto"],
        separator: ",",
        dateFormat: "DD/MM/YYYY",
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
      separator: ";",
      dateFormat: "DD/M/YYYY",
    },
  },
}

// CBUs precargados por tipo de transferencia
export const CBU_PRESETS: Record<string, Record<string, string[]>> = {
  "MEP-DL0": {
    "banco-valores": ["2990000000002307000000", "4320001010003415620011"],
    "banco-comafi": ["0650001010000012345678", "0650001010000087654321"],
  },
  "MEP-GC1": {
    "banco-valores": ["2990000000002293790008", "AÑADIR"],
  },
  "MEP-D20": {
    "banco-valores": ["22500"],
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
