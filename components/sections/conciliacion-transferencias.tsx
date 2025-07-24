"use client"

import type React from "react"

import { useState, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ProgressModal from "@/components/ui/progress-modal"
import {
  Upload,
  FileSpreadsheet,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  BarChart3,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Download,
  Plus,
  X,
  AlertCircle,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ResultadoConciliacion, TipoConciliacion } from "@/lib/conciliacion-types"
import {
  parseStatusOrdenesPago,
  parseConfirmacionSolicitudes,
  parseRecibosPago,
  parseMovimientosBancarios,
  crearSolicitudesPago,
  realizarConciliacion,
} from "@/lib/conciliacion-parser"
import { exportarConciliacionExcel } from "@/lib/conciliacion-excel-export"

// Interfaz para archivos bancarios con información CERA
interface ArchivoBancario {
  file: File
  esCera: boolean
  id: string
}

interface DetalleModalProps {
  item: any
  onClose: () => void
}

function DetalleModal({ item, onClose }: DetalleModalProps) {
  if (!item) return null

  const getTipoBadge = (tipo: TipoConciliacion) => {
    switch (tipo) {
      case "completa":
        return <Badge className="bg-green-500">Completa</Badge>
      case "por-importe":
        return <Badge className="bg-yellow-500">Por Importe</Badge>
      default:
        return <Badge variant="destructive">No Conciliado</Badge>
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Detalle de Conciliación</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Información principal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Tipo:</strong> {item.origen || "Movimiento"}
            </div>
            <div>
              <strong>Estado:</strong> {getTipoBadge(item.tipoConciliacion)}
            </div>
            <div>
              <strong>CUIT:</strong> {item.CUIT || "N/A"}
            </div>
            <div>
              <strong>Fecha:</strong> {item.Fecha || item["Fecha Liquidación"] || "N/A"}
            </div>
            <div>
              <strong>Importe:</strong> {item.Moneda || "$"} {item.Importe?.toLocaleString() || "N/A"}
            </div>
            <div>
              <strong>CERA/CCE:</strong> {item.esCce ? "CCE" : item.esCera ? "CERA" : "Normal"}
            </div>
          </div>

          {/* Movimientos conciliados */}
          {item.movimientosConciliados && item.movimientosConciliados.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Conciliado con:</h4>
              {item.movimientosConciliados.map((mov: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Beneficiario:</strong> {mov.Beneficiario}
                    </div>
                    <div>
                      <strong>CUIT:</strong> {mov.CUIT}
                    </div>
                    <div>
                      <strong>Fecha:</strong> {mov.Fecha}
                    </div>
                    <div>
                      <strong>Importe:</strong> {mov.Moneda} {mov.Importe?.toLocaleString()}
                    </div>
                    <div>
                      <strong>Tipo:</strong> {mov.esCera ? "CERA" : "Normal"}
                    </div>
                    <div>
                      <strong>D/C:</strong> {mov["D/C"]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Con qué se concilió (para movimientos) */}
          {item.conciliadoCon && item.conciliadoCon.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Concilió con:</h4>
              {item.conciliadoCon.map((conc: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Origen:</strong> {conc.origen}
                    </div>
                    <div>
                      <strong>CUIT:</strong> {conc.CUIT}
                    </div>
                    <div>
                      <strong>Fecha:</strong> {conc.Fecha || conc["Fecha Liquidación"]}
                    </div>
                    <div>
                      <strong>Importe:</strong> {conc.Moneda || "$"} {conc.Importe?.toLocaleString()}
                    </div>
                    <div>
                      <strong>Tipo:</strong> {conc.esCce ? "CCE" : "Normal"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Datos originales */}
          <div>
            <h4 className="font-semibold mb-2">Datos Originales:</h4>
            <div className="bg-gray-50 p-3 rounded text-xs max-h-40 overflow-y-auto">
              <pre>{JSON.stringify(item.datosOriginales, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConciliacionTransferencias() {
  const { toast } = useToast()

  // Estados para archivos
  const [archivoStatus, setArchivoStatus] = useState<File | null>(null)
  const [archivoConfirmacion, setArchivoConfirmacion] = useState<File | null>(null)
  const [archivoRecibos, setArchivoRecibos] = useState<File | null>(null)

  // Estados para múltiples archivos bancarios
  const [archivosBancariosPesos, setArchivosBancariosPesos] = useState<ArchivoBancario[]>([])
  const [archivosBancariosUSD, setArchivosBancariosUSD] = useState<ArchivoBancario[]>([])

  // Estados para datos procesados
  const [resultadoConciliacion, setResultadoConciliacion] = useState<ResultadoConciliacion | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Estados para modal de progreso
  const [showProgress, setShowProgress] = useState(false)
  const [progressTitle, setProgressTitle] = useState("")
  const [progressMessage, setProgressMessage] = useState("")
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)

  // Estados para filtros y búsqueda
  const [filtroSolicitudes, setFiltroSolicitudes] = useState<"todos" | "completos" | "por-importe" | "no-conciliados">(
    "todos",
  )
  const [filtroRecibos, setFiltroRecibos] = useState<"todos" | "completos" | "por-importe" | "no-conciliados">("todos")
  const [filtroMovimientos, setFiltroMovimientos] = useState<"todos" | "completos" | "por-importe" | "no-conciliados">(
    "todos",
  )
  const [busquedaSolicitudes, setBusquedaSolicitudes] = useState("")
  const [busquedaRecibos, setBusquedaRecibos] = useState("")
  const [busquedaMovimientos, setBusquedaMovimientos] = useState("")

  // Estados para modal de detalles
  const [showDetalles, setShowDetalles] = useState(false)
  const [detallesSeleccionados, setDetallesSeleccionados] = useState<any>(null)

  // Estados para modal CERA
  const [showCeraModal, setShowCeraModal] = useState(false)
  const [archivoTemporal, setArchivoTemporal] = useState<File | null>(null)
  const [tipoMonedaTemporal, setTipoMonedaTemporal] = useState<"pesos" | "usd">("pesos")

  // Referencias para inputs de archivos
  const statusInputRef = useRef<HTMLInputElement>(null)
  const confirmacionInputRef = useRef<HTMLInputElement>(null)
  const recibosInputRef = useRef<HTMLInputElement>(null)
  const movimientosPesosInputRef = useRef<HTMLInputElement>(null)
  const movimientosUSDInputRef = useRef<HTMLInputElement>(null)

  // Función para obtener color según tipo de conciliación
  const getColorPorTipo = (tipo: TipoConciliacion): string => {
    switch (tipo) {
      case "completa":
        return "bg-green-50"
      case "por-importe":
        return "bg-yellow-50"
      case "no-conciliado":
        return "bg-red-50"
      default:
        return "bg-gray-50"
    }
  }

  // Función para obtener icono según tipo de conciliación
  const getIconoPorTipo = (tipo: TipoConciliacion) => {
    switch (tipo) {
      case "completa":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "por-importe":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case "no-conciliado":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <XCircle className="w-4 h-4 text-gray-600" />
    }
  }

  // Función para manejar selección de archivos básicos
  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>,
    tipo: string,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar extensión
    const validExtensions = [".xlsx", ".xls", ".csv"]
    const fileName = file.name.toLowerCase()
    const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext))

    if (!hasValidExtension) {
      toast({
        title: "Archivo no válido",
        description: "Use archivos .xlsx, .xls o .csv",
        variant: "destructive",
      })
      return
    }

    setter(file)
    toast({
      title: `Archivo ${tipo} cargado`,
      description: `${file.name} - ${(file.size / 1024).toFixed(1)} KB`,
    })
  }

  // Función para manejar selección de archivos bancarios
  const handleBankFileSelect = (event: React.ChangeEvent<HTMLInputElement>, tipoMoneda: "pesos" | "usd") => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar extensión
    const validExtensions = [".xlsx", ".xls", ".csv"]
    const fileName = file.name.toLowerCase()
    const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext))

    if (!hasValidExtension) {
      toast({
        title: "Archivo no válido",
        description: "Use archivos .xlsx, .xls o .csv",
        variant: "destructive",
      })
      return
    }

    // Mostrar modal para preguntar si es CERA
    setArchivoTemporal(file)
    setTipoMonedaTemporal(tipoMoneda)
    setShowCeraModal(true)
  }

  // Función para confirmar archivo bancario con información CERA
  const confirmarArchivoBancario = (esCera: boolean) => {
    if (!archivoTemporal) return

    const nuevoArchivo: ArchivoBancario = {
      file: archivoTemporal,
      esCera,
      id: `${Date.now()}-${Math.random()}`,
    }

    if (tipoMonedaTemporal === "pesos") {
      setArchivosBancariosPesos((prev) => [...prev, nuevoArchivo])
    } else {
      setArchivosBancariosUSD((prev) => [...prev, nuevoArchivo])
    }

    toast({
      title: `Archivo ${tipoMonedaTemporal.toUpperCase()} agregado`,
      description: `${archivoTemporal.name} - ${esCera ? "CERA" : "Normal"} - ${(archivoTemporal.size / 1024).toFixed(1)} KB`,
    })

    // Limpiar estados temporales
    setArchivoTemporal(null)
    setShowCeraModal(false)

    // Limpiar input
    if (tipoMonedaTemporal === "pesos" && movimientosPesosInputRef.current) {
      movimientosPesosInputRef.current.value = ""
    } else if (tipoMonedaTemporal === "usd" && movimientosUSDInputRef.current) {
      movimientosUSDInputRef.current.value = ""
    }
  }

  // Función para eliminar archivo bancario
  const eliminarArchivoBancario = (id: string, tipoMoneda: "pesos" | "usd") => {
    if (tipoMoneda === "pesos") {
      setArchivosBancariosPesos((prev) => prev.filter((archivo) => archivo.id !== id))
    } else {
      setArchivosBancariosUSD((prev) => prev.filter((archivo) => archivo.id !== id))
    }

    toast({
      title: "Archivo eliminado",
      description: `Archivo ${tipoMoneda.toUpperCase()} eliminado de la lista`,
    })
  }

  // Función para actualizar progreso
  const updateProgress = (current: number, total: number, message: string) => {
    setProgressCurrent(current)
    setProgressTotal(total)
    setProgressMessage(message)
  }

  // Función para exportar resultados a Excel
  const exportarResultados = () => {
    if (!resultadoConciliacion) {
      toast({
        title: "No hay datos para exportar",
        description: "Debe procesar la conciliación primero",
        variant: "destructive",
      })
      return
    }

    try {
      exportarConciliacionExcel(resultadoConciliacion)
      toast({
        title: "Exportación exitosa",
        description: "El archivo Excel se ha descargado correctamente",
      })
    } catch (error) {
      console.error("Error exportando:", error)
      toast({
        title: "Error en la exportación",
        description: "No se pudo generar el archivo Excel",
        variant: "destructive",
      })
    }
  }

  // Función principal para procesar todos los archivos
  const procesarArchivos = async () => {
    if (!archivoStatus || !archivoConfirmacion || !archivoRecibos || archivosBancariosPesos.length === 0) {
      toast({
        title: "Archivos faltantes",
        description: "Debe cargar al menos Status, Confirmación, Comprobantes y un archivo bancario de Pesos",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setShowProgress(true)
    setProgressTitle("Procesando archivos...")

    try {
      console.log("🔄 Iniciando procesamiento de archivos...")

      // Procesar Status Órdenes con progreso
      setProgressMessage("Procesando Status Órdenes de Pago...")
      const statusData = await parseStatusOrdenesPago(archivoStatus, updateProgress)

      // Procesar otros archivos
      setProgressMessage("Procesando Confirmación de Solicitudes...")
      const confirmacionData = await parseConfirmacionSolicitudes(archivoConfirmacion)

      // Procesar Comprobantes con progreso
      setProgressMessage("Procesando Comprobantes de Pago...")
      const recibosData = await parseRecibosPago(archivoRecibos, updateProgress)

      setProgressMessage("Procesando Movimientos Bancarios...")

      // Procesar múltiples archivos bancarios
      let todosMovimientosPesos: any[] = []
      let todasTransferenciasPesos: any[] = []
      let todosMercadosPesos: any[] = []

      // Procesar archivos de pesos
      for (const archivoBancario of archivosBancariosPesos) {
        const resultado = await parseMovimientosBancarios(archivoBancario.file, archivoBancario.esCera)

        // Marcar movimientos con información CERA
        resultado.movimientos.forEach((mov) => {
          mov.esCera = archivoBancario.esCera
        })
        resultado.transferencias.forEach((trans) => {
          trans.esCera = archivoBancario.esCera
        })
        resultado.mercados.forEach((merc) => {
          merc.esCera = archivoBancario.esCera
        })

        todosMovimientosPesos = [...todosMovimientosPesos, ...resultado.movimientos]
        todasTransferenciasPesos = [...todasTransferenciasPesos, ...resultado.transferencias]
        todosMercadosPesos = [...todosMercadosPesos, ...resultado.mercados]
      }

      // Procesar archivos USD si existen
      let todosMovimientosUSD: any[] = []
      let todasTransferenciasUSD: any[] = []
      let todosMercadosUSD: any[] = []

      for (const archivoBancario of archivosBancariosUSD) {
        const resultado = await parseMovimientosBancarios(archivoBancario.file, archivoBancario.esCera)

        // Marcar movimientos con información CERA
        resultado.movimientos.forEach((mov) => {
          mov.esCera = archivoBancario.esCera
        })
        resultado.transferencias.forEach((trans) => {
          trans.esCera = archivoBancario.esCera
        })
        resultado.mercados.forEach((merc) => {
          merc.esCera = archivoBancario.esCera
        })

        todosMovimientosUSD = [...todosMovimientosUSD, ...resultado.movimientos]
        todasTransferenciasUSD = [...todasTransferenciasUSD, ...resultado.transferencias]
        todosMercadosUSD = [...todosMercadosUSD, ...resultado.mercados]
      }

      console.log("📊 Datos procesados:", {
        statusOrdenes: statusData.length,
        confirmaciones: confirmacionData.length,
        comprobantes: recibosData.length,
        movimientosPesos: todosMovimientosPesos.length,
        movimientosUSD: todosMovimientosUSD.length,
      })

      setProgressMessage("Creando solicitudes de pago...")
      // Unir solicitudes de pago
      const solicitudesPago = crearSolicitudesPago(statusData, confirmacionData)

      // Combinar todos los movimientos
      const todosMovimientos = [...todosMovimientosPesos, ...todosMovimientosUSD]
      const todasTransferencias = [...todasTransferenciasPesos, ...todasTransferenciasUSD]
      const todosMercados = [...todosMercadosPesos, ...todosMercadosUSD]

      setProgressMessage("Realizando conciliación completa y por importe...")
      // Realizar conciliación (ahora incluye lógica CERA)
      const resultado = realizarConciliacion(solicitudesPago, recibosData, todosMovimientos)

      // Agregar transferencias y mercados al resultado
      resultado.transferenciasMonetarias = todasTransferencias
      resultado.movimientosMercados = todosMercados

      setResultadoConciliacion(resultado)

      toast({
        title: "Procesamiento completado",
        description: `Completos: ${resultado.estadisticas.conciliadosCompletos}, Por importe: ${resultado.estadisticas.conciliadosPorImporte}, No conciliados: ${resultado.estadisticas.noConciliados}`,
      })
    } catch (error) {
      console.error("❌ Error procesando archivos:", error)
      toast({
        title: "Error al procesar",
        description: "Ocurrió un error al procesar los archivos. Verifique el formato.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setShowProgress(false)
    }
  }

  // Función para limpiar todo
  const limpiarTodo = () => {
    setArchivoStatus(null)
    setArchivoConfirmacion(null)
    setArchivoRecibos(null)
    setArchivosBancariosPesos([])
    setArchivosBancariosUSD([])
    setResultadoConciliacion(null)

    // Limpiar inputs
    if (statusInputRef.current) statusInputRef.current.value = ""
    if (confirmacionInputRef.current) confirmacionInputRef.current.value = ""
    if (recibosInputRef.current) recibosInputRef.current.value = ""
    if (movimientosPesosInputRef.current) movimientosPesosInputRef.current.value = ""
    if (movimientosUSDInputRef.current) movimientosUSDInputRef.current.value = ""

    toast({
      title: "Datos limpiados",
      description: "Se eliminaron todos los archivos y datos procesados",
    })
  }

  // Función para mostrar detalles
  const mostrarDetalles = (item: any) => {
    setDetallesSeleccionados(item)
    setShowDetalles(true)
  }

  // Función para formatear números
  const formatearNumero = (numero: number | null | undefined): string => {
    if (numero === null || numero === undefined || Number.isNaN(numero)) {
      return "-"
    }
    return numero.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Función para filtrar solicitudes
  const solicitudesFiltradas =
    resultadoConciliacion?.solicitudesPago.filter((solicitud) => {
      // Filtro por estado de conciliación
      if (filtroSolicitudes === "completos" && solicitud.tipoConciliacion !== "completa") {
        return false
      }
      if (filtroSolicitudes === "por-importe" && solicitud.tipoConciliacion !== "por-importe") {
        return false
      }
      if (filtroSolicitudes === "no-conciliados" && solicitud.tipoConciliacion !== "no-conciliado") {
        return false
      }

      // Filtro por búsqueda
      if (busquedaSolicitudes.trim()) {
        const termino = busquedaSolicitudes.toLowerCase()
        return (
          String(solicitud["Comitente (Número)"] || "")
            .toLowerCase()
            .includes(termino) ||
          String(solicitud["Comitente (Denominación)"] || solicitud["Comitente (Descripción)"] || "")
            .toLowerCase()
            .includes(termino) ||
          String(solicitud.CUIT || "").includes(termino)
        )
      }

      return true
    }) || []

  // Función para filtrar comprobantes
  const recibosFiltrados =
    resultadoConciliacion?.recibosPago.filter((recibo) => {
      // Filtro por estado de conciliación
      if (filtroRecibos === "completos" && recibo.tipoConciliacion !== "completa") {
        return false
      }
      if (filtroRecibos === "por-importe" && recibo.tipoConciliacion !== "por-importe") {
        return false
      }
      if (filtroRecibos === "no-conciliados" && recibo.tipoConciliacion !== "no-conciliado") {
        return false
      }

      // Filtro por búsqueda
      if (busquedaRecibos.trim()) {
        const termino = busquedaRecibos.toLowerCase()
        return (
          String(recibo["Comitente (Número)"] || "")
            .toLowerCase()
            .includes(termino) ||
          String(recibo["Comitente (Denominación)"] || "")
            .toLowerCase()
            .includes(termino) ||
          String(recibo.CUIT || "").includes(termino)
        )
      }

      return true
    }) || []

  // Función para filtrar movimientos
  const movimientosFiltrados =
    resultadoConciliacion?.movimientosBancarios.filter((movimiento) => {
      // Filtro por estado de conciliación
      if (filtroMovimientos === "completos" && movimiento.tipoConciliacion !== "completa") {
        return false
      }
      if (filtroMovimientos === "por-importe" && movimiento.tipoConciliacion !== "por-importe") {
        return false
      }
      if (filtroMovimientos === "no-conciliados" && movimiento.tipoConciliacion !== "no-conciliado") {
        return false
      }

      // Filtro por búsqueda
      if (busquedaMovimientos.trim()) {
        const termino = busquedaMovimientos.toLowerCase()
        return (
          String(movimiento.Beneficiario || "")
            .toLowerCase()
            .includes(termino) || String(movimiento.CUIT || "").includes(termino)
        )
      }

      return true
    }) || []

  const getTipoBadge = (tipo: TipoConciliacion) => {
    switch (tipo) {
      case "completa":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completa
          </Badge>
        )
      case "por-importe":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="w-3 h-3 mr-1" />
            Por Importe
          </Badge>
        )
      default:
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            No Conciliado
          </Badge>
        )
    }
  }

  const estadisticas = useMemo(() => {
    if (!resultadoConciliacion) return null

    const stats = resultadoConciliacion.estadisticas
    const total = stats.totalSolicitudes + stats.totalRecibos + stats.totalMovimientos
    const conciliados = stats.conciliadosCompletos + stats.conciliadosPorImporte
    const porcentajeConciliado = total > 0 ? (conciliados / total) * 100 : 0

    return {
      ...stats,
      total,
      conciliados,
      porcentajeConciliado,
    }
  }, [resultadoConciliacion])

  return (
    <div className="space-y-6 px-2">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          Conciliación TR VALO
        </h1>
        <p className="text-gray-600">Sistema de conciliación entre solicitudes, comprobantes y movimientos bancarios</p>
      </div>

      {/* Modal de Progreso */}
      <ProgressModal
        isOpen={showProgress}
        title={progressTitle}
        message={progressMessage}
        current={progressCurrent}
        total={progressTotal}
      />

      {/* Modal para confirmar si archivo es CERA */}
      <Dialog open={showCeraModal} onOpenChange={setShowCeraModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración del Archivo Bancario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                ¿El archivo que estás cargando es <strong>CERA</strong>?
              </p>
              <p className="text-xs text-gray-500 mb-6">
                Los archivos CERA solo se concilian con comitentes que contengan "(CCE)" en su descripción.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => confirmarArchivoBancario(false)} className="bg-blue-600 hover:bg-blue-700">
                ✅ Es Normal
              </Button>
              <Button onClick={() => confirmarArchivoBancario(true)} variant="outline">
                ❌ Es CERA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Carga de Archivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Carga de Archivos Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Órdenes de Pago */}
            <div className="space-y-2">
              <Label>Status Órdenes de Pago *</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => statusInputRef.current?.click()} className="flex-1">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {archivoStatus ? "Cambiar" : "Seleccionar"}
                </Button>
                {archivoStatus && (
                  <Badge variant="outline" className="text-xs">
                    {archivoStatus.name}
                  </Badge>
                )}
              </div>
              <input
                ref={statusInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileSelect(e, setArchivoStatus, "Status")}
                className="hidden"
              />
            </div>

            {/* Confirmación de Solicitudes */}
            <div className="space-y-2">
              <Label>Confirmación de Solicitudes *</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => confirmacionInputRef.current?.click()} className="flex-1">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {archivoConfirmacion ? "Cambiar" : "Seleccionar"}
                </Button>
                {archivoConfirmacion && (
                  <Badge variant="outline" className="text-xs">
                    {archivoConfirmacion.name}
                  </Badge>
                )}
              </div>
              <input
                ref={confirmacionInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileSelect(e, setArchivoConfirmacion, "Confirmación")}
                className="hidden"
              />
            </div>

            {/* Comprobantes de Pago */}
            <div className="space-y-2">
              <Label>Comprobantes de Pago *</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => recibosInputRef.current?.click()} className="flex-1">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {archivoRecibos ? "Cambiar" : "Seleccionar"}
                </Button>
                {archivoRecibos && (
                  <Badge variant="outline" className="text-xs">
                    {archivoRecibos.name}
                  </Badge>
                )}
              </div>
              <input
                ref={recibosInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileSelect(e, setArchivoRecibos, "Comprobantes")}
                className="hidden"
              />
            </div>
          </div>

          {/* Movimientos Bancarios con soporte múltiple */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Movimientos Bancarios</h3>

            {/* Movimientos Bancarios Pesos */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Movimientos Bancarios Pesos *</Label>
                <Button variant="outline" size="sm" onClick={() => movimientosPesosInputRef.current?.click()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Archivo
                </Button>
              </div>

              <input
                ref={movimientosPesosInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleBankFileSelect(e, "pesos")}
                className="hidden"
              />

              {/* Lista de archivos de pesos */}
              {archivosBancariosPesos.length > 0 && (
                <div className="space-y-2">
                  {archivosBancariosPesos.map((archivo) => (
                    <div key={archivo.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      <span className="text-sm flex-1">{archivo.file.name}</span>
                      <Badge variant={archivo.esCera ? "default" : "secondary"} className="text-xs">
                        {archivo.esCera ? "CERA" : "Normal"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => eliminarArchivoBancario(archivo.id, "pesos")}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Movimientos Bancarios USD */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Movimientos Bancarios USD</Label>
                <Button variant="outline" size="sm" onClick={() => movimientosUSDInputRef.current?.click()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Archivo
                </Button>
              </div>

              <input
                ref={movimientosUSDInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleBankFileSelect(e, "usd")}
                className="hidden"
              />

              {/* Lista de archivos USD */}
              {archivosBancariosUSD.length > 0 && (
                <div className="space-y-2">
                  {archivosBancariosUSD.map((archivo) => (
                    <div key={archivo.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      <span className="text-sm flex-1">{archivo.file.name}</span>
                      <Badge variant={archivo.esCera ? "default" : "secondary"} className="text-xs">
                        {archivo.esCera ? "CERA" : "Normal"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => eliminarArchivoBancario(archivo.id, "usd")}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Nueva funcionalidad CERA:</strong> Los archivos marcados como CERA solo se concilian con
              comitentes que contengan "(CCE)" en su descripción.
              <br />
              <strong>Múltiples archivos:</strong> Puede cargar varios archivos bancarios por moneda. Cada archivo puede
              ser CERA o Normal.
              <br />
              <strong>Semáforo:</strong> 🟢 Verde = Conciliado completo, 🟡 Amarillo = Conciliado por importe, 🔴 Rojo =
              No conciliado
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={procesarArchivos}
              disabled={
                isProcessing ||
                !archivoStatus ||
                !archivoConfirmacion ||
                !archivoRecibos ||
                archivosBancariosPesos.length === 0
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Procesar y Conciliar
                </>
              )}
            </Button>

            {resultadoConciliacion && (
              <Button onClick={exportarResultados} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Exportar a Excel
              </Button>
            )}

            <Button variant="destructive" onClick={limpiarTodo}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Todo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas de Conciliación */}
      {resultadoConciliacion && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Estadísticas de Conciliación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {resultadoConciliacion.estadisticas.totalSolicitudes}
                </div>
                <div className="text-sm text-gray-500">Solicitudes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {resultadoConciliacion.estadisticas.totalRecibos}
                </div>
                <div className="text-sm text-gray-500">Comprobantes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {resultadoConciliacion.estadisticas.totalMovimientos}
                </div>
                <div className="text-sm text-gray-500">Movimientos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {resultadoConciliacion.estadisticas.conciliadosCompletos}
                </div>
                <div className="text-sm text-gray-500">🟢 Completos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {resultadoConciliacion.estadisticas.conciliadosPorImporte}
                </div>
                <div className="text-sm text-gray-500">🟡 Por Importe</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {resultadoConciliacion.estadisticas.noConciliados}
                </div>
                <div className="text-sm text-gray-500">🔴 No Conciliados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tablas de Conciliación */}
      {resultadoConciliacion && (
        <div className="space-y-6">
          {/* Contenedor con scroll horizontal optimizado */}
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {/* Tabla de Solicitudes de Pago */}
              <Card className="min-w-80 flex-shrink-0">
                <CardHeader>
                  <CardTitle className="text-lg">Solicitudes de Pago</CardTitle>
                  <div className="flex gap-2">
                    <Select value={filtroSolicitudes} onValueChange={setFiltroSolicitudes}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="completos">🟢 Completos</SelectItem>
                        <SelectItem value="por-importe">🟡 Por Importe</SelectItem>
                        <SelectItem value="no-conciliados">🔴 No Conciliados</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 flex-1">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar..."
                        value={busquedaSolicitudes}
                        onChange={(e) => setBusquedaSolicitudes(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-xs">Comitente</TableHead>
                          <TableHead className="text-xs">CUIT</TableHead>
                          <TableHead className="text-xs">Moneda</TableHead>
                          <TableHead className="text-xs">Importe</TableHead>
                          <TableHead className="text-xs">CCE</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">Ver</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudesFiltradas.map((solicitud) => (
                          <TableRow key={solicitud.id} className={getColorPorTipo(solicitud.tipoConciliacion)}>
                            <TableCell className="text-xs">{solicitud.Fecha}</TableCell>
                            <TableCell className="text-xs">{solicitud["Comitente (Número)"]}</TableCell>
                            <TableCell className="text-xs font-mono">{solicitud.CUIT}</TableCell>
                            <TableCell className="text-xs">{solicitud.Moneda || "$"}</TableCell>
                            <TableCell className="text-xs">{formatearNumero(solicitud.Importe)}</TableCell>
                            <TableCell className="text-xs">
                              {solicitud.esCce ? (
                                <Badge variant="outline" className="text-xs">
                                  CCE
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>{getIconoPorTipo(solicitud.tipoConciliacion)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => mostrarDetalles(solicitud)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {solicitudesFiltradas.length} de {resultadoConciliacion.solicitudesPago.length} solicitudes
                  </div>
                </CardContent>
              </Card>

              {/* Tabla de Comprobantes de Pago */}
              <Card className="min-w-80 flex-shrink-0">
                <CardHeader>
                  <CardTitle className="text-lg">Comprobantes de Pago</CardTitle>
                  <div className="flex gap-2">
                    <Select value={filtroRecibos} onValueChange={setFiltroRecibos}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="completos">🟢 Completos</SelectItem>
                        <SelectItem value="por-importe">🟡 Por Importe</SelectItem>
                        <SelectItem value="no-conciliados">🔴 No Conciliados</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 flex-1">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar..."
                        value={busquedaRecibos}
                        onChange={(e) => setBusquedaRecibos(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-xs">Comitente</TableHead>
                          <TableHead className="text-xs">CUIT</TableHead>
                          <TableHead className="text-xs">Moneda</TableHead>
                          <TableHead className="text-xs">Importe</TableHead>
                          <TableHead className="text-xs">CCE</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">Ver</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recibosFiltrados.map((recibo) => (
                          <TableRow key={recibo.id} className={getColorPorTipo(recibo.tipoConciliacion)}>
                            <TableCell className="text-xs">{recibo["Fecha Liquidación"]}</TableCell>
                            <TableCell className="text-xs">{recibo["Comitente (Número)"]}</TableCell>
                            <TableCell className="text-xs font-mono">{recibo.CUIT}</TableCell>
                            <TableCell className="text-xs">{recibo.Moneda || "$"}</TableCell>
                            <TableCell className="text-xs">{formatearNumero(recibo.Importe)}</TableCell>
                            <TableCell className="text-xs">
                              {recibo.esCce ? (
                                <Badge variant="outline" className="text-xs">
                                  CCE
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>{getIconoPorTipo(recibo.tipoConciliacion)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => mostrarDetalles(recibo)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {recibosFiltrados.length} de {resultadoConciliacion.recibosPago.length} comprobantes
                  </div>
                </CardContent>
              </Card>

              {/* Tabla de Movimientos Bancarios */}
              <Card className="min-w-80 flex-shrink-0">
                <CardHeader>
                  <CardTitle className="text-lg">Movimientos Bancarios</CardTitle>
                  <div className="flex gap-2">
                    <Select value={filtroMovimientos} onValueChange={setFiltroMovimientos}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="completos">🟢 Completos</SelectItem>
                        <SelectItem value="por-importe">🟡 Por Importe</SelectItem>
                        <SelectItem value="no-conciliados">🔴 No Conciliados</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 flex-1">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar..."
                        value={busquedaMovimientos}
                        onChange={(e) => setBusquedaMovimientos(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-xs">Beneficiario</TableHead>
                          <TableHead className="text-xs">CUIT</TableHead>
                          <TableHead className="text-xs">Moneda</TableHead>
                          <TableHead className="text-xs">Importe</TableHead>
                          <TableHead className="text-xs">CERA</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">Ver</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientosFiltrados.map((movimiento) => (
                          <TableRow key={movimiento.id} className={getColorPorTipo(movimiento.tipoConciliacion)}>
                            <TableCell className="text-xs">{movimiento.Fecha}</TableCell>
                            <TableCell className="text-xs truncate max-w-28" title={movimiento.Beneficiario}>
                              {movimiento.Beneficiario}
                            </TableCell>
                            <TableCell className="text-xs font-mono">{movimiento.CUIT}</TableCell>
                            <TableCell className="text-xs">{movimiento.Moneda || "$"}</TableCell>
                            <TableCell className="text-xs">{formatearNumero(movimiento.Importe)}</TableCell>
                            <TableCell className="text-xs">
                              {movimiento.esCera ? (
                                <Badge variant="default" className="text-xs">
                                  CERA
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Normal
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{getIconoPorTipo(movimiento.tipoConciliacion)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => mostrarDetalles(movimiento)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {movimientosFiltrados.length} de {resultadoConciliacion.movimientosBancarios.length} movimientos
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Tablas Adicionales */}
      {resultadoConciliacion && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Transferencias Monetarias */}
          <Card>
            <CardHeader>
              <CardTitle>💰 Transferencias Monetarias</CardTitle>
              <p className="text-sm text-gray-500">CUIT: 30711610126 (Débitos y Créditos)</p>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Beneficiario</TableHead>
                      <TableHead className="text-xs">D/C</TableHead>
                      <TableHead className="text-xs">Importe</TableHead>
                      <TableHead className="text-xs">Moneda</TableHead>
                      <TableHead className="text-xs">CERA</TableHead>
                      <TableHead className="text-xs">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadoConciliacion.transferenciasMonetarias.map((transferencia) => (
                      <TableRow key={transferencia.id}>
                        <TableCell className="text-xs">{transferencia.Fecha}</TableCell>
                        <TableCell className="text-xs truncate max-w-28" title={transferencia.Beneficiario}>
                          {transferencia.Beneficiario}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={transferencia["D/C"] === "C" ? "default" : "secondary"}>
                            {transferencia["D/C"]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatearNumero(transferencia.Importe)}</TableCell>
                        <TableCell className="text-xs">{transferencia.Moneda || "$"}</TableCell>
                        <TableCell className="text-xs">
                          {transferencia.esCera ? (
                            <Badge variant="default" className="text-xs">
                              CERA
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => mostrarDetalles(transferencia)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {resultadoConciliacion.transferenciasMonetarias.length} transferencias
              </div>
            </CardContent>
          </Card>

          {/* Movimientos de Mercados */}
          <Card>
            <CardHeader>
              <CardTitle>📈 Mercados</CardTitle>
              <p className="text-sm text-gray-500">MATBA ROFEX, BYMA, MAV, MAE - 30711610126 (Débitos y Créditos)</p>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Beneficiario</TableHead>
                      <TableHead className="text-xs">D/C</TableHead>
                      <TableHead className="text-xs">Importe</TableHead>
                      <TableHead className="text-xs">Moneda</TableHead>
                      <TableHead className="text-xs">CERA</TableHead>
                      <TableHead className="text-xs">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadoConciliacion.movimientosMercados.map((mercado) => (
                      <TableRow key={mercado.id}>
                        <TableCell className="text-xs">{mercado.Fecha}</TableCell>
                        <TableCell className="text-xs truncate max-w-28" title={mercado.Beneficiario}>
                          {mercado.Beneficiario}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={mercado["D/C"] === "C" ? "default" : "secondary"}>{mercado["D/C"]}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatearNumero(mercado.Importe)}</TableCell>
                        <TableCell className="text-xs">{mercado.Moneda || "$"}</TableCell>
                        <TableCell className="text-xs">
                          {mercado.esCera ? (
                            <Badge variant="default" className="text-xs">
                              CERA
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => mostrarDetalles(mercado)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {resultadoConciliacion.movimientosMercados.length} movimientos de mercados
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Detalles */}
      <Dialog open={showDetalles} onOpenChange={setShowDetalles}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Registro</DialogTitle>
          </DialogHeader>
          {detallesSeleccionados && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tipo de Registro</Label>
                  <p className="text-sm text-gray-600">
                    {detallesSeleccionados.origen
                      ? `Solicitud (${detallesSeleccionados.origen})`
                      : detallesSeleccionados["Fecha Liquidación"]
                        ? "Comprobante de Pago"
                        : detallesSeleccionados.Beneficiario
                          ? "Movimiento Bancario"
                          : "Registro"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">ID</Label>
                  <p className="text-sm text-gray-600 font-mono">{detallesSeleccionados.id}</p>
                </div>
              </div>

              {/* Mostrar información CERA */}
              {detallesSeleccionados.esCera !== undefined && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium mb-3">Información CERA</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={detallesSeleccionados.esCera ? "default" : "secondary"}>
                      {detallesSeleccionados.esCera ? "CERA" : "Normal"}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {detallesSeleccionados.esCera
                        ? "Solo se concilia con comitentes (CCE)"
                        : "Se concilia con comitentes normales"}
                    </span>
                  </div>
                </div>
              )}

              {/* Estado de conciliación */}
              {detallesSeleccionados.tipoConciliacion && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium mb-3">Estado de Conciliación</h4>
                  <div className="flex items-center gap-2">
                    {getIconoPorTipo(detallesSeleccionados.tipoConciliacion)}
                    <span className="text-sm font-medium">
                      {detallesSeleccionados.tipoConciliacion === "completa" && "🟢 Conciliado Completo"}
                      {detallesSeleccionados.tipoConciliacion === "por-importe" && "🟡 Conciliado por Importe"}
                      {detallesSeleccionados.tipoConciliacion === "no-conciliado" && "🔴 No Conciliado"}
                    </span>
                  </div>
                </div>
              )}

              {/* Mostrar movimientos conciliados */}
              {(detallesSeleccionados.movimientosConciliados?.length > 0 ||
                detallesSeleccionados.conciliadoCon?.length > 0) && (
                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium mb-3">
                    {detallesSeleccionados.movimientosConciliados?.length > 0 ? "Conciliado con:" : "Conciliado por:"}
                  </h4>
                  <div className="space-y-2">
                    {/* Si es solicitud/comprobante, mostrar movimientos */}
                    {detallesSeleccionados.movimientosConciliados?.map((mov: any, index: number) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border">
                        <div>
                          <strong>Movimiento:</strong> {mov.id}
                        </div>
                        <div>
                          <strong>Fecha:</strong> {mov.Fecha}
                        </div>
                        <div>
                          <strong>Beneficiario:</strong> {mov.Beneficiario}
                        </div>
                        <div>
                          <strong>CUIT:</strong> {mov.CUIT}
                        </div>
                        <div>
                          <strong>Importe:</strong> {formatearNumero(mov.Importe)} {mov.Moneda}
                        </div>
                        <div>
                          <strong>CERA:</strong> {mov.esCera ? "Sí" : "No"}
                        </div>
                      </div>
                    ))}

                    {/* Si es movimiento, mostrar con qué se concilió */}
                    {detallesSeleccionados.conciliadoCon?.map((item: any, index: number) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border">
                        <div>
                          <strong>Tipo:</strong> {item.origen ? `Solicitud (${item.origen})` : "Comprobante"}
                        </div>
                        <div>
                          <strong>ID:</strong> {item.id}
                        </div>
                        <div>
                          <strong>Fecha:</strong> {item.Fecha || item["Fecha Liquidación"]}
                        </div>
                        <div>
                          <strong>CUIT:</strong> {item.CUIT}
                        </div>
                        <div>
                          <strong>Importe:</strong> {formatearNumero(item.Importe)} {item.Moneda}
                        </div>
                        <div>
                          <strong>CCE:</strong> {item.esCce ? "Sí" : "No"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Datos principales */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Datos Principales</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(detallesSeleccionados)
                    .filter(
                      ([key]) =>
                        !key.includes("conciliado") &&
                        key !== "datosOriginales" &&
                        key !== "id" &&
                        key !== "tipoConciliacion" &&
                        key !== "esCera" &&
                        key !== "esCce" &&
                        key !== "yaUtilizado" &&
                        key !== "movimientosConciliados" &&
                        key !== "conciliadoCon",
                    )
                    .map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium text-gray-600">{key}:</span>
                        <span className="ml-2">{String(value)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Datos originales del Excel */}
              {detallesSeleccionados.datosOriginales && (
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h4 className="font-medium mb-3">Datos Originales del Excel</h4>
                  <div className="max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {Object.entries(detallesSeleccionados.datosOriginales).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium text-gray-600 min-w-32">{key}:</span>
                          <span className="ml-2 break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
