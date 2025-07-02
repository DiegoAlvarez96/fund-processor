// Tipos base para Status Órdenes de Pago
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

// Tipos para Confirmación de Solicitudes
export interface ConfirmacionSolicitud {
  fecha: string
  estado: string
  comitenteNumero: string
  comitenteDenominacion: string
  monedaDescripcion: string
  importe: number
  datosOriginales: Record<string, any>
}

// Tipos para Solicitudes de Pago (unión de Status y Confirmación)
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

// Tipos para Recibos de Pago
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

// Tipos para Movimientos Bancarios
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

// Tipos para Transferencias Monetarias
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

// Tipos para Movimientos de Mercados
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

// Estadísticas de conciliación
export interface EstadisticasConciliacion {
  totalSolicitudes: number
  totalRecibos: number
  totalMovimientos: number
  conciliadosCompletos: number
  noConciliados: number
}

// Resultado completo de la conciliación
export interface ResultadoConciliacion {
  solicitudesPago: SolicitudPago[]
  recibosPago: ReciboPago[]
  movimientosBancarios: MovimientoBancario[]
  transferenciasMonetarias: TransferenciaMonetaria[]
  movimientosMercados: MovimientoMercado[]
  estadisticas: EstadisticasConciliacion
}

// Tipos para exportación a Excel
export interface ResumenConciliacion {
  solicitudes: {
    cantidad: number
    importeTotal: number
    conciliados: number
    noConciliados: number
  }
  recibos: {
    cantidad: number
    importeTotal: number
    conciliados: number
    noConciliados: number
  }
  movimientos: {
    cantidad: number
    importeTotal: number
    conciliados: number
    noConciliados: number
  }
  diferencias: {
    solicitudesVsRecibos: {
      cantidad: number
      importe: number
    }
    solicitudesVsMovimientos: {
      cantidad: number
      importe: number
    }
    recibosVsMovimientos: {
      cantidad: number
      importe: number
    }
  }
}
