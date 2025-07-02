// Tipos para los diferentes archivos Excel

export interface StatusOrdenPago {
  fechaConcertacion: string
  comitenteNumero: string
  comitenteDescripcion: string
  moneda: string
  importe: number
  cuit: string
  estado: string
  // Datos originales completos para el modal
  datosOriginales?: Record<string, any>
}

export interface ConfirmacionSolicitud {
  fecha: string
  estado: string
  comitenteNumero: string
  comitenteDenominacion: string
  monedaDescripcion: string
  importe: number
  // Datos originales completos para el modal
  datosOriginales?: Record<string, any>
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
  // Estados de conciliación
  conciliadoRecibos: boolean
  conciliadoMovimientos: boolean
  // Datos originales para el modal
  datosOriginales?: Record<string, any>
}

export interface ReciboPago {
  id: string
  fechaLiquidacion: string
  comitenteDenominacion: string
  comitenteNumero: string
  importe: number
  cuit: string
  // Estados de conciliación
  conciliadoSolicitudes: boolean
  conciliadoMovimientos: boolean
  // Datos originales para el modal
  datosOriginales?: Record<string, any>
}

export interface MovimientoBancario {
  id: string
  fecha: string
  beneficiario: string
  cuit: string
  dc: string
  importe: number
  moneda: string // Inferida del archivo (pesos/usd)
  // Estados de conciliación
  conciliadoSolicitudes: boolean
  conciliadoRecibos: boolean
  // Datos originales para el modal
  datosOriginales?: Record<string, any>
}

export interface TransferenciaMonetaria {
  id: string
  fecha: string
  beneficiario: string
  cuit: string
  dc: string
  importe: number
  moneda: string
  datosOriginales?: Record<string, any>
}

export interface MovimientoMercado {
  id: string
  fecha: string
  beneficiario: string
  cuit: string
  dc: string
  importe: number
  moneda: string
  datosOriginales?: Record<string, any>
}

// Tipo para la clave de conciliación
export interface ClaveConciliacion {
  fecha: string
  cuit: string
  moneda: string
  importe: number
}

// Tipo para el resultado de conciliación
export interface ResultadoConciliacion {
  solicitudesPago: SolicitudPago[]
  recibosPago: ReciboPago[]
  movimientosBancarios: MovimientoBancario[]
  transferenciasMonetarias: TransferenciaMonetaria[]
  movimientosMercados: MovimientoMercado[]
  estadisticas: {
    totalSolicitudes: number
    totalRecibos: number
    totalMovimientos: number
    conciliadosCompletos: number
    noConciliados: number
  }
}
