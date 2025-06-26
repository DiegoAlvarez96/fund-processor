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
    "banco-valores": ["2990000000002293790008", "2990000000015072580211"],
    "banco-comafi": ["0650001010000012345678", "0650001010000087654321"],
  },
  "MEP-GC1": {
    "banco-valores": ["2990000000002293790008", "2990000000015072580211"],
  },
  "MEP-D20": {
    "banco-valores": ["2990000000002293790008"],
  },
}

// Cuentas origen disponibles
export const CUENTAS_ORIGEN = [
  { value: "4320001010003415620011", label: "Cuenta Corriente Principal - 4320001010003415620011" },
  { value: "4320001010003415620022", label: "Cuenta Corriente Secundaria - 4320001010003415620022" },
  { value: "4320001010003415620033", label: "Cuenta de Inversiones - 4320001010003415620033" },
]
