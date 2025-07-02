"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileSpreadsheet, Mail, Trash2, FileText, TrendingUp, AlertCircle, Info, Send } from "lucide-react"
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

export default function TitulosProcessor() {
  const [rawData, setRawData] = useState("")
  const [operaciones, setOperaciones] = useState<TituloOperacion[]>([])
  const [filtroMercado, setFiltroMercado] = useState("todos")
  const [excelFiles, setExcelFiles] = useState<Record<string, Blob>>({})
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [inputFormat, setInputFormat] = useState("")

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

  // Detectar formato cuando cambian los datos
  const handleDataChange = (value: string) => {
    setRawData(value)
    if (value.trim()) {
      const format = detectInputFormat(value)
      setInputFormat(format)
    } else {
      setInputFormat("")
    }
  }

  // Procesar datos con lotes y barra de progreso (memoizado)
  const procesarDatos = useCallback(async () => {
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
      console.log("🔄 Iniciando procesamiento por lotes...")
      console.log("📊 Formato detectado:", inputFormat)

      const operacionesParsed = await parseTitulosDataBatched(
        rawData,
        (progressData: ProcessingProgress) => {
          setProgress(progressData)
        },
        150, // Tamaño de lote optimizado
      )

      if (operacionesParsed.length === 0) {
        toast({
          title: "Sin operaciones válidas",
          description:
            "No se pudieron procesar los datos. Verifique que cada línea tenga exactamente 12 columnas y termine con BYMA, MAV o MAE.",
          variant: "destructive",
        })
        return
      }

      setOperaciones(operacionesParsed)
      setExcelFiles({}) // Limpiar archivos anteriores

      const summary = getMercadoSummary(operacionesParsed)
      const totalOps = Object.values(summary).reduce((sum, count) => sum + count, 0)

      // Pequeña pausa para mostrar el 100% antes de cerrar
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
  }, [rawData, inputFormat, toast])

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
        title: "Emails generados",
        description: `Se abrieron ${mercadosConDatos.length} emails en Outlook con sus archivos adjuntos`,
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
    toast({
      title: "Datos limpiados",
      description: "Se eliminaron todos los datos y archivos",
    })
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

  // Ejemplo de formato mejorado
  const ejemploFormato = `MAMOGRAFIA DIGITAL SA 3,07E+10 B.E.GLOBALES U$S STEP UP 2035 1 Pesos 35868 837,794 30049995 0 0 0 MAV
SUCIC, MICAELA ELIANA 2,73E+10 BONO NACION ARG.U$S STEP UP 2030 LA 0 Dolar MEP (Local) 1529 0,683897 1045,68 0 0 0 BYMA
VICO, NESTOR HUGO 2,03E+10 CEDEAR AMAZON.COM INC. 1 Pesos 1 1850 1850 0 0 0 MAE`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Gestión de Títulos
        </h1>
        <p className="text-gray-600">Procesador de Operaciones Diarias por Mercado</p>
      </div>

      {/* Carga de Datos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Carga de Datos
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
              💡 Tip: Cada línea debe tener exactamente 12 columnas separadas por espacios y terminar con BYMA, MAV o
              MAE.
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={procesarDatos} disabled={isProcessing || !rawData.trim()}>
              {isProcessing ? "🔄 Procesando..." : "🔄 Procesar Datos"}
            </Button>
            <Button variant="outline" onClick={() => handleDataChange("")} disabled={!rawData.trim()}>
              🗑️ Limpiar
            </Button>
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
              <strong>Formato requerido (12 columnas):</strong>
              <ul className="list-disc list-inside mt-1 text-sm">
                <li>
                  Cliente // CUIT // Especie // Plazo // Moneda // Cant.Comprada // Precio.Compra // Monto.Comprado //
                  Cant.Vendida // Precio.Venta // Monto.Vendido // Mercado
                </li>
                <li>Cada línea debe terminar con BYMA, MAV o MAE</li>
                <li>El CUIT puede estar en formato científico (ej: 3,07E+10)</li>
                <li>La especie puede contener números (ej: "BONO 2030") - se mantendrá como un solo campo</li>
              </ul>
            </AlertDescription>
          </Alert>
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
