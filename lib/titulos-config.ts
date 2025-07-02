// Configuración por mercado
export interface MercadoConfig {
  agenteCNV: string
  agente: string
  nombreArchivo: (fecha: string) => string
  destinatarios: string
  asunto: string
  color: string
  bgColor: string
  textColor: string
}

export const MERCADO_CONFIG: Record<string, MercadoConfig> = {
  BYMA: {
    agenteCNV: "148",
    agente: "97",
    nombreArchivo: (fecha: string) => `${fecha}AG0097.xlsx`,
    destinatarios: "au-cnv-r624@byma.com.ar; mario.salort@byma.com.ar",
    asunto: "Informe de Operaciones Diarias Agente AG 0097- BYMA",
    color: "#2563eb",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  MAE: {
    agenteCNV: "148",
    agente: "648",
    nombreArchivo: (fecha: string) => `INFORME DE OPERACIONES A3 - AG648 ${fecha}.xlsx`,
    destinatarios: "mailscnv_control@a3mercados.com.ar",
    asunto: "Informe de Operaciones Diarios AG 648 -A3",
    color: "#ca8a04",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
  },
  MAV: {
    agenteCNV: "148",
    agente: "545",
    nombreArchivo: (fecha: string) => `INFORME DE OPERACIONES MAV- AG545 ${fecha}.xlsx`,
    destinatarios: "Rgcnv624@mav-sa.com.ar",
    asunto: "Informe de Operaciones Diarios AG 545 MAV",
    color: "#16a34a",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
}

// Plantilla de email
export const EMAIL_TEMPLATE = `Estimados, Buenas tardes,

<p>Adjunto el informe conforme a la RG 624.

<p>Por favor confirmar recepción

<p>Saludos`

// Información fija para Excel (A1:B6)
export const EXCEL_HEADER_INFO = {
  A1: "Clientes operaciones diarias",
  A2: "Agente CNV N°",
  A3: "Agente",
  A4: "Denominación del Agente:",
  A5: "Fecha de Concertacion:",
  B4: "ADCAP SECURITIES ARGENTINA S.A.",
}
