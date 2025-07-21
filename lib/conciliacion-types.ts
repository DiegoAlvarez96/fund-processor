// Tipos de conciliación posibles
export type TipoConciliacion = "completa" | "por-importe" | "no-conciliado"

// Interfaz para el resultado de la conciliación
export interface ResultadoConciliacion {
  solicitudesPago: any[]
  recibosPago: any[]
  movimientosBancarios: any[]
  transferenciasMonetarias: any[]
  movimientosMercados: any[]
  estadisticas: {
    totalSolicitudes: number
    totalRecibos: number
    totalMovimientos: number
    conciliadosCompletos: number
    conciliadosPorImporte: number
    noConciliados: number
  }
}

// Interfaz para registros con estado de conciliación
export interface RegistroConConciliacion {
  id: string
  tipoConciliacion: TipoConciliacion
  CUIT: string
  Fecha: string
  Moneda: string
  Importe: number
  esCce?: boolean
  esCera?: boolean
  datosOriginales: any
}

// Interfaz para solicitudes de pago
export interface SolicitudPago extends RegistroConConciliacion {
  origen: "status" | "confirmacion"
  "Comitente (Número)": string
  "Comitente (Denominación)": string
  "Comitente (Descripción)": string
  conciliadoRecibos: boolean
  conciliadoMovimientos: boolean
  conciliadoRecibosPorImporte: boolean
  conciliadoMovimientosPorImporte: boolean
  movimientosConciliados?: any[]
}

// Interfaz para comprobantes de pago
export interface ComprobantePago extends RegistroConConciliacion {
  origen: "recibos"
  "Fecha Liquidación": string
  "Comitente (Número)": string
  "Comitente (Denominación)": string
  "CUIT/CUIL titular de la cuenta": string
  conciliadoSolicitudes: boolean
  conciliadoMovimientos: boolean
  conciliadoSolicitudesPorImporte: boolean
  conciliadoMovimientosPorImporte: boolean
  movimientosConciliados?: any[]
}

// Interfaz para movimientos bancarios
export interface MovimientoBancario extends RegistroConConciliacion {
  Beneficiario: string
  "D/C": string
  conciliadoSolicitudes: boolean
  conciliadoRecibos: boolean
  conciliadoSolicitudesPorImporte: boolean
  conciliadoRecibosPorImporte: boolean
  conciliadoCon?: any[]
}

// Interfaz para transferencias monetarias
export interface TransferenciaMonetaria {
  id: string
  Fecha: string
  Beneficiario: string
  CUIT: string
  "D/C": string
  Importe: number
  Moneda: string
  esCera: boolean
  datosOriginales: any
}

// Interfaz para movimientos de mercados
export interface MovimientoMercado {
  id: string
  Fecha: string
  Beneficiario: string
  CUIT: string
  "D/C": string
  Importe: number
  Moneda: string
  esCera: boolean
  datosOriginales: any
}

// Interfaz para estadísticas de conciliación
export interface EstadisticasConciliacion {
  totalSolicitudes: number
  totalRecibos: number
  totalMovimientos: number
  conciliadosCompletos: number
  conciliadosPorImporte: number
  noConciliados: number
  porcentajeConciliado: number
}

// Interfaz para archivos bancarios con información CERA
export interface ArchivoBancario {
  file: File
  esCera: boolean
  id: string
}

// Interfaz para configuración de conciliación
export interface ConfiguracionConciliacion {
  validarCera: boolean
  toleranciaImporte: number
  incluirTransferencias: boolean
  incluirMercados: boolean
}

// Tipos para filtros de tablas
export type FiltroEstado = "todos" | "completos" | "por-importe" | "no-conciliados"

// Interfaz para parámetros de búsqueda
export interface ParametrosBusqueda {
  termino: string
  filtroEstado: FiltroEstado
  fechaDesde?: string
  fechaHasta?: string
  moneda?: string
}
