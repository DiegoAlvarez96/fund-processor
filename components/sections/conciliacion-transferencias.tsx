"use client"

import type React from "react"

import { useState, useRef } from "react"
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
  AlertCircle,
  Trash2,
  RefreshCw,
  Download,
  AlertTriangle,
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

export default function ConciliacionTransferencias() {
  const { toast } = useToast()

  // Estados para archivos
  const [archivoStatus, setArchivoStatus] = useState<File | null>(null)
  const [archivoConfirmacion, setArchivoConfirmacion] = useState<File | null>(null)
  const [archivoRecibos, setArchivoRecibos] = useState<File | null>(null)
  const [archivoMovimientosPesos, setArchivoMovimientosPesos] = useState<File | null>(null)
  const [archivoMovimientosUSD, setArchivoMovimientosUSD] = useState<File | null>(null)

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

  // Función para manejar selección de archivos
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
    if (!archivoStatus || !archivoConfirmacion || !archivoRecibos || !archivoMovimientosPesos) {
      toast({
        title: "Archivos faltantes",
        description: "Debe cargar al menos Status, Confirmación, Recibos y Movimientos Pesos",
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

      // Procesar Recibos con progreso
      setProgressMessage("Procesando Recibos de Pago...")
      const recibosData = await parseRecibosPago(archivoRecibos, updateProgress)

      setProgressMessage("Procesando Movimientos Bancarios...")
      const [movimientosPesosData, movimientosUSDData] = await Promise.all([
        parseMovimientosBancarios(archivoMovimientosPesos),
        archivoMovimientosUSD
          ? parseMovimientosBancarios(archivoMovimientosUSD)
          : Promise.resolve({ movimientos: [], transferencias: [], mercados: [] }),
      ])

      console.log("📊 Datos procesados:", {
        statusOrdenes: statusData.length,
        confirmaciones: confirmacionData.length,
        recibos: recibosData.length,
        movimientosPesos: movimientosPesosData.movimientos.length,
        movimientosUSD: movimientosUSDData.movimientos.length,
      })

      setProgressMessage("Creando solicitudes de pago...")
      // Unir solicitudes de pago
      const solicitudesPago = crearSolicitudesPago(statusData, confirmacionData)

      // Combinar movimientos de pesos y USD
      const todosMovimientos = [...movimientosPesosData.movimientos, ...movimientosUSDData.movimientos]

      const todasTransferencias = [...movimientosPesosData.transferencias, ...movimientosUSDData.transferencias]

      const todosMercados = [...movimientosPesosData.mercados, ...movimientosUSDData.mercados]

      setProgressMessage("Realizando conciliación completa y por importe...")
      // Realizar conciliación (ahora incluye ambos tipos)
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
    setArchivoMovimientosPesos(null)
    setArchivoMovimientosUSD(null)
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
  const formatearNumero = (numero: number): string => {
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
          solicitud.comitenteNumero.toLowerCase().includes(termino) ||
          solicitud.comitenteDescripcion.toLowerCase().includes(termino) ||
          solicitud.cuit.includes(termino)
        )
      }

      return true
    }) || []

  // Función para filtrar recibos
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
          recibo.comitenteNumero.toLowerCase().includes(termino) ||
          recibo.comitenteDenominacion.toLowerCase().includes(termino) ||
          recibo.cuit.includes(termino)
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
        return movimiento.beneficiario.toLowerCase().includes(termino) || movimiento.cuit.includes(termino)
      }

      return true
    }) || []

  return (
    <div className="space-y-6 px-2">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          Conciliación TR VALO
        </h1>
        <p className="text-gray-600">Sistema de conciliación entre solicitudes, recibos y movimientos bancarios</p>
      </div>

      {/* Modal de Progreso */}
      <ProgressModal
        isOpen={showProgress}
        title={progressTitle}
        message={progressMessage}
        current={progressCurrent}
        total={progressTotal}
      />

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

            {/* Recibos de Pago */}
            <div className="space-y-2">
              <Label>Recibos de Pago *</Label>
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
                onChange={(e) => handleFileSelect(e, setArchivoRecibos, "Recibos")}
                className="hidden"
              />
            </div>

            {/* Movimientos Bancarios Pesos */}
            <div className="space-y-2">
              <Label>Movimientos Bancarios Pesos *</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => movimientosPesosInputRef.current?.click()} className="flex-1">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {archivoMovimientosPesos ? "Cambiar" : "Seleccionar"}
                </Button>
                {archivoMovimientosPesos && (
                  <Badge variant="outline" className="text-xs">
                    {archivoMovimientosPesos.name}
                  </Badge>
                )}
              </div>
              <input
                ref={movimientosPesosInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileSelect(e, setArchivoMovimientosPesos, "Movimientos Pesos")}
                className="hidden"
              />
            </div>

            {/* Movimientos Bancarios USD */}
            <div className="space-y-2">
              <Label>Movimientos Bancarios USD</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => movimientosUSDInputRef.current?.click()} className="flex-1">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {archivoMovimientosUSD ? "Cambiar" : "Seleccionar"}
                </Button>
                {archivoMovimientosUSD && (
                  <Badge variant="outline" className="text-xs">
                    {archivoMovimientosUSD.name}
                  </Badge>
                )}
              </div>
              <input
                ref={movimientosUSDInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileSelect(e, setArchivoMovimientosUSD, "Movimientos USD")}
                className="hidden"
              />
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Conciliación automática:</strong> El sistema realizará primero una conciliación completa (fecha +
              CUIT + moneda + importe) y luego una conciliación automática por importe para los registros no
              conciliados.
              <br />
              <strong>Semáforo:</strong> 🟢 Verde = Conciliado completo, 🟡 Amarillo = Conciliado por importe, 🔴 Rojo =
              No conciliado
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={procesarArchivos}
              disabled={
                isProcessing || !archivoStatus || !archivoConfirmacion || !archivoRecibos || !archivoMovimientosPesos
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
                <div className="text-sm text-gray-500">Recibos</div>
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
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">Ver</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {solicitudesFiltradas.map((solicitud) => (
                          <TableRow key={solicitud.id} className={getColorPorTipo(solicitud.tipoConciliacion)}>
                            <TableCell className="text-xs">{solicitud.fecha}</TableCell>
                            <TableCell className="text-xs">{solicitud.comitenteNumero}</TableCell>
                            <TableCell className="text-xs font-mono">{solicitud.cuit}</TableCell>
                            <TableCell className="text-xs">{solicitud.moneda}</TableCell>
                            <TableCell className="text-xs">{formatearNumero(solicitud.importe)}</TableCell>
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

              {/* Tabla de Recibos de Pago */}
              <Card className="min-w-80 flex-shrink-0">
                <CardHeader>
                  <CardTitle className="text-lg">Recibos de Pago</CardTitle>
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
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">Ver</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recibosFiltrados.map((recibo) => (
                          <TableRow key={recibo.id} className={getColorPorTipo(recibo.tipoConciliacion)}>
                            <TableCell className="text-xs">{recibo.fechaLiquidacion}</TableCell>
                            <TableCell className="text-xs">{recibo.comitenteNumero}</TableCell>
                            <TableCell className="text-xs font-mono">{recibo.cuit}</TableCell>
                            <TableCell className="text-xs">{recibo.moneda || "$"}</TableCell>
                            <TableCell className="text-xs">{formatearNumero(recibo.importe)}</TableCell>
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
                    {recibosFiltrados.length} de {resultadoConciliacion.recibosPago.length} recibos
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
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs">Ver</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientosFiltrados.map((movimiento) => (
                          <TableRow key={movimiento.id} className={getColorPorTipo(movimiento.tipoConciliacion)}>
                            <TableCell className="text-xs">{movimiento.fecha}</TableCell>
                            <TableCell className="text-xs truncate max-w-28" title={movimiento.beneficiario}>
                              {movimiento.beneficiario}
                            </TableCell>
                            <TableCell className="text-xs font-mono">{movimiento.cuit}</TableCell>
                            <TableCell className="text-xs">{movimiento.moneda}</TableCell>
                            <TableCell className="text-xs">{formatearNumero(movimiento.importe)}</TableCell>
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
                      <TableHead className="text-xs">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadoConciliacion.transferenciasMonetarias.map((transferencia) => (
                      <TableRow key={transferencia.id}>
                        <TableCell className="text-xs">{transferencia.fecha}</TableCell>
                        <TableCell className="text-xs truncate max-w-28" title={transferencia.beneficiario}>
                          {transferencia.beneficiario}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={transferencia.dc === "C" ? "default" : "secondary"}>{transferencia.dc}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatearNumero(transferencia.importe)}</TableCell>
                        <TableCell className="text-xs">{transferencia.moneda}</TableCell>
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
                      <TableHead className="text-xs">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadoConciliacion.movimientosMercados.map((mercado) => (
                      <TableRow key={mercado.id}>
                        <TableCell className="text-xs">{mercado.fecha}</TableCell>
                        <TableCell className="text-xs truncate max-w-28" title={mercado.beneficiario}>
                          {mercado.beneficiario}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={mercado.dc === "C" ? "default" : "secondary"}>{mercado.dc}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatearNumero(mercado.importe)}</TableCell>
                        <TableCell className="text-xs">{mercado.moneda}</TableCell>
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
                      : detallesSeleccionados.fechaLiquidacion
                        ? "Recibo de Pago"
                        : detallesSeleccionados.beneficiario
                          ? "Movimiento Bancario"
                          : "Registro"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">ID</Label>
                  <p className="text-sm text-gray-600 font-mono">{detallesSeleccionados.id}</p>
                </div>
              </div>

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
                        key !== "tipoConciliacion",
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
