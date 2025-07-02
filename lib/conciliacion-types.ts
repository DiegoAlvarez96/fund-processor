// Tipos base para los datos de entrada
export interface StatusOrdenPago {
  fechaConcertacion: string
  comitenteNumero: string
  comitenteDescripcion: string
  moneda: string
  importe: number
  cuit: string
  estado: string
  especie: string
  plazo: string
  mercado: string
  datosOriginales: Record<string, any>
}

export interface ConfirmacionSolicitud {
  fecha: string
  estado: string
  comitenteNumero: string
  comitenteDenominacion: string
  monedaDescripcion: string
  importe: number
  cuit: string
  datosOriginales: Record<string, any>
}

// Tipos para conciliación
export type TipoConciliacion = "completa" | "por-importe" | "no-conciliado"

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
  conciliadoRecibosPorImporte: boolean
  conciliadoMovimientosPorImporte: boolean
  tipoConciliacion: TipoConciliacion
  datosOriginales: Record<string, any>
}

export interface ReciboPago {
  id: string
  fechaLiquidacion: string
  comitenteDenominacion: string
  comitenteNumero: string
  importe: number
  cuit: string
  moneda: string
  conciliadoSolicitudes: boolean
  conciliadoMovimientos: boolean
  conciliadoSolicitudesPorImporte: boolean
  conciliadoMovimientosPorImporte: boolean
  tipoConciliacion: TipoConciliacion
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
  conciliadoSolicitudesPorImporte: boolean
  conciliadoRecibosPorImporte: boolean
  tipoConciliacion: TipoConciliacion
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

// Tipos para estadísticas y resultados
export interface EstadisticasConciliacion {
  totalSolicitudes: number
  totalRecibos: number
  totalMovimientos: number
  conciliadosCompletos: number
  conciliadosPorImporte: number
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

// Tipos para resumen de exportación
export interface ResumenItem {
  cantidad: number
  importeTotal: number
  conciliados: number
  conciliadosPorImporte: number
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
