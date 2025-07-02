"use client"

import type React from "react"

import { useState, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileSpreadsheet, Mail, Trash2, TrendingUp, AlertCircle, Info, Send, Upload, FileUp, Type } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { TituloOperacion } from "@/lib/titulos-parser"
import {
  parseTitulosDataBatched,
  getMercadoSummary,
  detectInputFormat,
  type ProcessingProgress,
} from "@/lib/titulos-parser"
import { generateAllTitulosExcel, getFileName } from "@/lib/titulos-excel"
import { MERCADO_CONFIG } from "@/lib/titulos-config"
import PaginatedTitulosTable from "./PaginatedTitulosTable"
import EmailPreviewModal from "./EmailPreviewModal"
import ProgressModal from "@/components/ui/progress-modal"

type InputMethod = "text" | "excel"

export default function TitulosProcessor() {
  const [inputMethod, setInputMethod] = useState<InputMethod>("excel")
  const [rawData, setRawData] = useState("")
  const [operaciones, setOperaciones] = useState<TituloOperacion[]>([])
  const [filtroMercado, setFiltroMercado] = useState("todos")
  const [excelFiles, setExcelFiles] = useState<Record<string, Blob>>({})
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [inputFormat, setInputFormat] = useState("")

  // Estados para carga de Excel
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Estados para el modal de progreso
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress>({
    processed: 0,
    total: 0,
    currentBatch: 0,
    totalBatches: 0,
    currentStep: "",
  })

  // Detectar formato cuando cambian los datos de texto
  const handleDataChange = (value: string) => {
    setRawData(value)
    if (value.trim()) {
      const format = detectInputFormat(value)
      setInputFormat(format)
    } else {
      setInputFormat("")
    }
  }

  // Manejar selección de archivo Excel
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log("📁 Archivo seleccionado:", file.name)

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

    // Verificar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo debe ser menor a 10MB",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)

    toast({
      title: "Archivo cargado",
      description: `${file.name} - ${(file.size / 1024).toFixed(1)} KB`,
    })
  }

  // Procesar datos desde texto (método existente)
  const procesarDatosTexto = useCallback(async () => {
    if (!rawData.trim()) {
      toast({
        title: "Sin datos",
        description: "Pegue los datos de operaciones para procesar",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setShowProgress(true)
    setProgress({ processed: 0, total: 0, currentBatch: 0, totalBatches: 0, currentStep: "Iniciando..." })

    try {
      console.log("🔄 Procesando datos de texto...")

      const operacionesParsed = await parseTitulosDataBatched(
        rawData,
        (progressData: ProcessingProgress) => {
          setProgress(progressData)
        },
        150,
      )

      if (operacionesParsed.length === 0) {
        toast({
          title: "Sin operaciones válidas",
          description: "No se pudieron procesar los datos. Verifique el formato.",
          variant: "destructive",
        })
        return
      }

      setOperaciones(operacionesParsed)
      setExcelFiles({})

      const summary = getMercadoSummary(operacionesParsed)
      const totalOps = Object.values(summary).reduce((sum, count) => sum + count, 0)

      setTimeout(() => {
        setShowProgress(false)
        toast({
          title: "Datos procesados exitosamente",
          description: `Se procesaron ${totalOps} operaciones: BYMA(${summary.BYMA}), MAV(${summary.MAV}), MAE(${summary.MAE})`,
        })
      }, 500)
    } catch (error) {
      console.error("❌ Error procesando datos:", error)
      toast({
        title: "Error al procesar",
        description: "Ocurrió un error inesperado. Revise la consola para más detalles.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [rawData, toast])

  // Procesar datos desde Excel (placeholder por ahora)
  const procesarDatosExcel = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "Sin archivo",
        description: "Seleccione un archivo Excel para procesar",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setShowProgress(true)
    setProgress({ processed: 0, total: 0, currentBatch: 0, totalBatches: 0, currentStep: "Leyendo archivo Excel..." })

    try {
      console.log("📊 Procesando archivo Excel:", selectedFile.name)

      // Importar dinámicamente la función de lectura de Excel
      const { readTitulosFromExcel } = await import("@/lib/titulos-excel-reader")

      const operacionesParsed = await readTitulosFromExcel(selectedFile)

      if (operacionesParsed.length === 0) {
        toast({
          title: "Sin operaciones válidas",
          description: "No se pudieron procesar los datos del Excel. Verifique la estructura del archivo.",
          variant: "destructive",
        })
        return
      }

      setOperaciones(operacionesParsed)
      setExcelFiles({})

      const summary = getMercadoSummary(operacionesParsed)
      const totalOps = Object.values(summary).reduce((sum, count) => sum + count, 0)

      setTimeout(() => {
        setShowProgress(false)
        toast({
          title: "Excel procesado exitosamente",
          description: `Se procesaron ${totalOps} operaciones: BYMA(${summary.BYMA}), MAV(${summary.MAV}), MAE(${summary.MAE})`,
        })
      }, 500)
    } catch (error) {
      console.error("❌ Error procesando Excel:", error)
      toast({
        title: "Error al procesar Excel",
        description: "Ocurrió un error al leer el archivo Excel. Verifique que el formato sea correcto.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setShowProgress(false)
    }
  }, [selectedFile, toast])

  // Función unificada para procesar datos
  const procesarDatos = () => {
    if (inputMethod === "text") {
      procesarDatosTexto()
    } else {
      procesarDatosExcel()
    }
  }

  // Generar archivos Excel
  const generarExcel = async () => {
    if (operaciones.length === 0) {
      toast({
        title: "Sin operaciones",
        description: "Procese los datos primero",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      console.log("📊 Generando archivos Excel...")
      const files = generateAllTitulosExcel(operaciones)

      if (Object.keys(files).length === 0) {
        toast({
          title: "Sin archivos generados",
          description: "No hay operaciones válidas para generar archivos",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      }

      setExcelFiles(files)

      const fileCount = Object.keys(files).length
      toast({
        title: "Archivos Excel generados",
        description: `Se generaron ${fileCount} archivos Excel listos para enviar`,
      })
    } catch (error) {
      console.error("❌ Error generando Excel:", error)
      toast({
        title: "Error al generar Excel",
        description: "Ocurrió un error al generar los archivos Excel",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Generar y enviar emails directamente
  const generarYEnviarEmails = async () => {
    if (operaciones.length === 0) {
      toast({
        title: "Sin operaciones",
        description: "Procese los datos primero",
        variant: "destructive",
      })
      return
    }

    // Generar Excel si no están generados
    if (Object.keys(excelFiles).length === 0) {
      await generarExcel()
    }

    // Esperar un momento para que se generen los archivos
    setTimeout(() => {
      const mercadosConDatos = Object.keys(excelFiles).filter((mercado) => mercadoSummary[mercado] > 0)

      mercadosConDatos.forEach((mercado) => {
        const config = MERCADO_CONFIG[mercado]
        const fileName = getFileName(mercado)
        const fileBlob = excelFiles[mercado]

        if (fileBlob) {
          // Crear URL del blob para descarga
          const fileUrl = URL.createObjectURL(fileBlob)

          // Construir mailto link
          const subject = encodeURIComponent(config.asunto)
          const body = encodeURIComponent(`Estimados, Buenas tardes,

Adjunto el informe conforme a la RG 624.

Por favor confirmar recepción

Saludos`)
          const to = encodeURIComponent(config.destinatarios)

          const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}`

          // Abrir Outlook
          window.open(mailtoLink, "_blank")

          // Crear link de descarga para el archivo
          const downloadLink = document.createElement("a")
          downloadLink.href = fileUrl
          downloadLink.download = fileName
          downloadLink.style.display = "none"
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)

          // Limpiar URL después de un tiempo
          setTimeout(() => {
            URL.revokeObjectURL(fileUrl)
          }, 1000)
        }
      })

      toast({
        title: "Emails y archivos preparados",
        description: `Se abrieron ${mercadosConDatos.length} emails en Outlook y se descargaron los archivos Excel. Adjunte manualmente los archivos descargados.`,
      })
    }, 1000)
  }

  // Limpiar todo
  const limpiarTodo = () => {
    setRawData("")
    setOperaciones([])
    setExcelFiles({})
    setFiltroMercado("todos")
    setInputFormat("")
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    toast({
      title: "Datos limpiados",
      description: "Se eliminaron todos los datos y archivos",
    })
  }

  // Cambiar método de entrada
  const handleInputMethodChange = (method: InputMethod) => {
    setInputMethod(method)
    // Limpiar datos del método anterior
    setRawData("")
    setSelectedFile(null)
    setInputFormat("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Memoizar el resumen por mercado:
  const mercadoSummary = useMemo(() => getMercadoSummary(operaciones), [operaciones])
  const totalOperaciones = useMemo(
    () => Object.values(mercadoSummary).reduce((sum, count) => sum + count, 0),
    [mercadoSummary],
  )

  // Memoizar el cálculo de progreso:
  const progressPercentage = useMemo(() => {
    if (progress.total === 0) return 0
    return Math.round((progress.processed / progress.total) * 100)
  }, [progress.processed, progress.total])

  // Ejemplo de formato mejorado con campos vacíos
  const ejemploFormato = `MAMOGRAFIA DIGITAL SA 27267948149 B.E.GLOBALES U$S STEP UP 2035 1 Pesos 35868 837,794 30049995 MAV
SECAR SECURITY ARGENTINA SA 30711610126 0 Pesos 445000000 MAE
SUCIC, MICAELA ELIANA 27301007089 BONO NACION ARG.U$S STEP UP 2030 LA 0 Dolar MEP (Local) 1529 0,683897 1045,68 BYMA`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Gestión de Títulos
        </h1>
        <p className="text-gray-600">Procesador de Operaciones Diarias por Mercado</p>
      </div>

      {/* Selección de Método de Entrada */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FileUp className="w-5 h-5" />
            Método de Carga de Datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input-method" className="text-sm font-medium text-blue-800">
              Seleccione cómo desea cargar los datos:
            </Label>
            <Select value={inputMethod} onValueChange={handleInputMethodChange}>
              <SelectTrigger className="w-full bg-white border-blue-300">
                <SelectValue placeholder="Seleccione método de entrada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-3 py-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Cargar Archivo Excel</div>
                      <div className="text-xs text-gray-500">Subir archivo .xlsx, .xls o .csv</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="text">
                  <div className="flex items-center gap-3 py-2">
                    <Type className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium">Pegar Texto</div>
                      <div className="text-xs text-gray-500">Copiar desde tabla o reporte</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ INFORMACIÓN ÚNICA SEGÚN EL MÉTODO SELECCIONADO */}
          <Alert className="border-blue-300 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {inputMethod === "text" ? (
                <>
                  <strong>Método Texto:</strong> Copie y pegue los datos directamente desde una tabla o reporte. Ideal
                  para datos rápidos pero puede tener problemas con campos vacíos.
                </>
              ) : (
                <>
                  <strong>Método Excel:</strong> Cargue un archivo Excel con los datos estructurados. Más confiable para
                  datos con campos vacíos y estructuras complejas. ✅ <em>Funcionalidad activa</em>
                </>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Carga de Datos - Método Texto */}
      {inputMethod === "text" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Carga de Datos por Texto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Información sobre formato detectado */}
            {inputFormat && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Formato detectado: <strong>{inputFormat}</strong>
                  {inputFormat === "mixed" && " - Se usarán múltiples métodos de parsing"}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Pegue aquí los datos de operaciones:</label>
              <Textarea
                value={rawData}
                onChange={(e) => handleDataChange(e.target.value)}
                placeholder={ejemploFormato}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Tip: El sistema detecta automáticamente la estructura. Los campos vacíos se manejan correctamente.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(ejemploFormato)
                  toast({ title: "Copiado", description: "Ejemplo copiado al portapapeles" })
                }}
              >
                📋 Ejemplo de Formato
              </Button>
            </div>

            {/* Ayuda para formatos */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Formatos soportados:</strong>
                <ul className="list-disc list-inside mt-1 text-sm">
                  <li>
                    <strong>Estructura completa:</strong> Cliente CUIT Especie Plazo Moneda CantComprada PrecioCompra
                    MontoComprado CantVendida PrecioVenta MontoVendido Mercado
                  </li>
                  <li>
                    <strong>Estructura simplificada:</strong> Cliente CUIT Plazo Moneda Cantidad Mercado
                  </li>
                  <li>
                    <strong>Campos vacíos:</strong> Se detectan automáticamente y se rellenan con "0" o valores por
                    defecto
                  </li>
                  <li>
                    Cada línea debe terminar con <strong>BYMA</strong>, <strong>MAV</strong> o <strong>MAE</strong>
                  </li>
                  <li>El CUIT puede estar en formato numérico (27267948149) o científico (3,07E+10)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Carga de Datos - Método Excel */}
      {inputMethod === "excel" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Carga de Datos por Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Seleccione archivo Excel:</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Seleccionar Archivo Excel
                </Button>
                {selectedFile && (
                  <Badge variant="outline" className="flex items-center gap-2">
                    <FileSpreadsheet className="w-3 h-3" />
                    {selectedFile.name}
                  </Badge>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-1">💡 Formatos soportados: .xlsx, .xls, .csv (máximo 10MB)</p>
            </div>

            {/* Ayuda para Excel */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Estructura esperada del Excel:</strong>
                <ul className="list-disc list-inside mt-1 text-sm">
                  <li>
                    <strong>Con headers:</strong> El sistema detectará automáticamente las columnas por nombre
                  </li>
                  <li>
                    <strong>Sin headers:</strong> Se asumirá orden estándar: Cliente, CUIT, Especie, Plazo, Moneda, etc.
                  </li>
                  <li>
                    <strong>Campos vacíos:</strong> Se manejarán correctamente y se rellenarán con valores por defecto
                  </li>
                  <li>
                    <strong>Mercado:</strong> Debe estar en una columna o detectarse en el texto (BYMA, MAV, MAE)
                  </li>
                  <li>
                    <strong>CUIT:</strong> Se manejará formato científico automáticamente
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Botón de Procesamiento */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Button
              onClick={procesarDatos}
              disabled={
                isProcessing ||
                (inputMethod === "text" && !rawData.trim()) ||
                (inputMethod === "excel" && !selectedFile)
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? "🔄 Procesando..." : "🔄 Procesar Datos"}
            </Button>
            <Button variant="outline" onClick={limpiarTodo}>
              🗑️ Limpiar Todo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen por Mercado */}
      {totalOperaciones > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Resumen por Mercado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {Object.entries(mercadoSummary).map(([mercado, count]) => {
                const config = MERCADO_CONFIG[mercado]
                if (count === 0) return null

                return (
                  <Badge key={mercado} className={`${config.bgColor} ${config.textColor} px-4 py-2 text-base`}>
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: config.color }} />
                    {mercado}: {count} operaciones
                  </Badge>
                )
              })}
              <Badge variant="outline" className="px-4 py-2 text-base">
                Total procesado: {totalOperaciones} registros
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      {operaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button onClick={generarExcel} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {isProcessing ? "Generando..." : "Generar Archivos Excel"}
              </Button>

              <Button onClick={generarYEnviarEmails} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Generar Emails
              </Button>

              <Button
                onClick={() => setShowEmailModal(true)}
                disabled={Object.keys(excelFiles).length === 0}
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200"
              >
                <Mail className="w-4 h-4 mr-2" />
                Previsualizar Emails
              </Button>

              <Button variant="destructive" onClick={limpiarTodo}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar Todo
              </Button>
            </div>

            {Object.keys(excelFiles).length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="font-medium">Archivos Excel Generados</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.keys(excelFiles).map((mercado) => {
                    const config = MERCADO_CONFIG[mercado]
                    return (
                      <Badge key={mercado} className={`${config.bgColor} ${config.textColor}`}>
                        {mercado} ({mercadoSummary[mercado]} ops)
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-green-600 text-sm mt-2">
                  ✅ Listos para enviar. Use "Generar Emails" para envío directo o "Previsualizar Emails" para editar
                  antes de enviar.
                </p>
                <p className="text-orange-600 text-xs mt-1">
                  📎 Nota: Los archivos Excel se descargarán automáticamente y deberás adjuntarlos manualmente en
                  Outlook por seguridad del navegador.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista Previa de Datos */}
      {operaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Vista Previa de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <PaginatedTitulosTable
              operaciones={operaciones}
              filtroMercado={filtroMercado}
              onFiltroChange={setFiltroMercado}
            />
          </CardContent>
        </Card>
      )}

      {/* Modal de Progreso */}
      <ProgressModal
        isOpen={showProgress}
        progress={progressPercentage}
        currentStep={progress.currentStep}
        processedItems={progress.processed}
        totalItems={progress.total}
      />

      {/* Modal de Previsualización de Emails */}
      <EmailPreviewModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        excelFiles={excelFiles}
        operacionesSummary={mercadoSummary}
      />
    </div>
  )
}
