// Tipos base para los datos de conciliación

export interface StatusOrdenPago {
  fechaConcertacion: string
  comitenteNumero: string
  comitenteDescripcion: string
  moneda: string
  importe: number
  cuit: string
  estado: string
  especie?: string
  plazo?: string
  mercado?: string
  datosOriginales: Record<string, any>
}

export interface ConfirmacionSolicitud {
  fecha: string
  estado: string
  comitenteNumero: string
  comitenteDenominacion: string
  monedaDescripcion: string
  importe: number
  cuit: string // NUEVA: Agregar CUIT a Confirmación de Solicitudes
  datosOriginales: Record<string, any>
}

export interface SolicitudPago {
  id: string
  fecha: string
  comitenteNumero: string
  comitenteDescripcion: string
  moneda: string
  importe: number
  cuit: string
  estado: string
  origen: "status" | "confirmacion"
  conciliadoRecibos: boolean
  conciliadoMovimientos: boolean
  datosOriginales: Record<string, any>
}

export interface ReciboPago {
  id: string
  fechaLiquidacion: string
  comitenteDenominacion: string
  comitenteNumero: string
  importe: number
  cuit: string
  conciliadoSolicitudes: boolean
  conciliadoMovimientos: boolean
  datosOriginales: Record<string, any>
}

export interface MovimientoBancario {
  id: string
  fecha: string
  beneficiario: string
  cuit: string
  dc: string
  importe: number
  moneda: string
  conciliadoSolicitudes: boolean
  conciliadoRecibos: boolean
  datosOriginales: Record<string, any>
}

export interface TransferenciaMonetaria {
  id: string
  fecha: string
  beneficiario: string
  cuit: string
  dc: string
  importe: number
  moneda: string
  datosOriginales: Record<string, any>
}

export interface MovimientoMercado {
  id: string
  fecha: string
  beneficiario: string
  cuit: string
  dc: string
  importe: number
  moneda: string
  datosOriginales: Record<string, any>
}

export interface EstadisticasConciliacion {
  totalSolicitudes: number
  totalRecibos: number
  totalMovimientos: number
  conciliadosCompletos: number
  noConciliados: number
}

export interface ResultadoConciliacion {
  solicitudesPago: SolicitudPago[]
  recibosPago: ReciboPago[]
  movimientosBancarios: MovimientoBancario[]
  transferenciasMonetarias: TransferenciaMonetaria[]
  movimientosMercados: MovimientoMercado[]
  estadisticas: EstadisticasConciliacion
}

// Tipos para el resumen de Excel
export interface ResumenItem {
  cantidad: number
  importeTotal: number
  conciliados: number
  noConciliados: number
}

export interface DiferenciaItem {
  cantidad: number
  importe: number
}

export interface ResumenConciliacion {
  solicitudes: ResumenItem
  recibos: ResumenItem
  movimientos: ResumenItem
  diferencias: {
    solicitudesVsRecibos: DiferenciaItem
    solicitudesVsMovimientos: DiferenciaItem
    recibosVsMovimientos: DiferenciaItem
  }
}
