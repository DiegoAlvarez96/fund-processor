"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileSpreadsheet, Mail, Trash2, FileText, TrendingUp, AlertCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { TituloOperacion } from "@/lib/titulos-parser"
import { parseTitulosData, getMercadoSummary, detectInputFormat, parseFromTableCopy } from "@/lib/titulos-parser"
import { generateAllTitulosExcel } from "@/lib/titulos-excel"
import { MERCADO_CONFIG } from "@/lib/titulos-config"
import TitulosTable from "./TitulosTable"
import EmailPreviewModal from "./EmailPreviewModal"

export default function TitulosProcessor() {
  const [rawData, setRawData] = useState("")
  const [operaciones, setOperaciones] = useState<TituloOperacion[]>([])
  const [filtroMercado, setFiltroMercado] = useState("todos")
  const [excelFiles, setExcelFiles] = useState<Record<string, Blob>>({})
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [inputFormat, setInputFormat] = useState("")

  const { toast } = useToast()

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

  // Procesar datos pegados con múltiples métodos
  const procesarDatos = () => {
    if (!rawData.trim()) {
      toast({
        title: "Sin datos",
        description: "Pegue los datos de operaciones para procesar",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      console.log("🔄 Iniciando procesamiento de datos...")
      console.log("📊 Formato detectado:", inputFormat)

      let operacionesParsed: TituloOperacion[] = []

      // Intentar múltiples métodos de parsing
      console.log("🔄 Método 1: Parser principal...")
      operacionesParsed = parseTitulosData(rawData)

      // Si no funciona, intentar parser específico para tablas
      if (operacionesParsed.length === 0) {
        console.log("🔄 Método 2: Parser de tabla...")
        operacionesParsed = parseFromTableCopy(rawData)
      }

      // Si aún no funciona, intentar parsing línea por línea más agresivo
      if (operacionesParsed.length === 0) {
        console.log("🔄 Método 3: Parser agresivo...")
        operacionesParsed = parseAggressively(rawData)
      }

      if (operacionesParsed.length === 0) {
        toast({
          title: "Sin operaciones válidas",
          description:
            "No se pudieron procesar los datos. Verifique el formato y que contengan BYMA, MAV o MAE al final de cada línea.",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      }

      setOperaciones(operacionesParsed)
      setExcelFiles({}) // Limpiar archivos anteriores

      const summary = getMercadoSummary(operacionesParsed)
      const totalOps = Object.values(summary).reduce((sum, count) => sum + count, 0)

      toast({
        title: "Datos procesados exitosamente",
        description: `Se procesaron ${totalOps} operaciones: BYMA(${summary.BYMA}), MAV(${summary.MAV}), MAE(${summary.MAE})`,
      })
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
  }

  // Parser agresivo como último recurso
  const parseAggressively = (rawData: string): TituloOperacion[] => {
    console.log("🔄 Usando parser agresivo...")
    const lines = rawData.trim().split(/\r\n|\r|\n/)
    const operaciones: TituloOperacion[] = []

    lines.forEach((line, index) => {
      if (!line.trim()) return

      // Buscar cualquier mención de mercado
      const mercados = ["BYMA", "MAV", "MAE"]
      let mercadoEncontrado = ""

      for (const mercado of mercados) {
        if (line.toUpperCase().includes(mercado)) {
          mercadoEncontrado = mercado
          break
        }
      }

      if (!mercadoEncontrado) return

      // Extraer nombre (primeras palabras hasta encontrar números)
      const words = line.trim().split(/\s+/)
      const nombreWords = []
      let startOfNumbers = -1

      for (let i = 0; i < words.length; i++) {
        if (/^\d/.test(words[i]) || /E[+-]\d/.test(words[i])) {
          startOfNumbers = i
          break
        }
        nombreWords.push(words[i])
      }

      if (startOfNumbers === -1 || nombreWords.length === 0) return

      const nombre = nombreWords.join(" ")
      const numericParts = words.slice(startOfNumbers).filter((w) => w !== mercadoEncontrado)

      if (numericParts.length >= 2) {
        const operacion: TituloOperacion = {
          denominacionCliente: nombre,
          cuitCuil: numericParts[0] || "",
          especie: numericParts.slice(1, -6).join(" ") || "N/A",
          plazo: "0",
          moneda: "Pesos",
          cantidadComprada: numericParts[numericParts.length - 6] || "0",
          precioPromedioCompra: numericParts[numericParts.length - 5] || "0",
          montoComprado: numericParts[numericParts.length - 4] || "0",
          cantidadVendida: numericParts[numericParts.length - 3] || "0",
          precioPromedioVenta: numericParts[numericParts.length - 2] || "0",
          montoVendido: numericParts[numericParts.length - 1] || "0",
          mercado: mercadoEncontrado,
        }

        operaciones.push(operacion)
        console.log(`✅ Operación parseada agresivamente: ${nombre} - ${mercadoEncontrado}`)
      }
    })

    return operaciones
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

  // Obtener resumen por mercado
  const mercadoSummary = getMercadoSummary(operaciones)
  const totalOperaciones = Object.values(mercadoSummary).reduce((sum, count) => sum + count, 0)

  // Ejemplo de formato mejorado
  const ejemploFormato = `SUCIC, MICAELA ELIANA 2,73E+10 BONO NACION ARG.U$S STEP UP 2030 LA 0 Dolar MEP (Local) 1529 0,683897 1045,68 BYMA
MAMOGRAFIA DIGITAL SA 3,07E+10 B.E.GLOBALES U$S STEP UP 2035 1 Pesos 35868 837,794 30049995 MAV
VICO, NESTOR HUGO 2,03E+10 CEDEAR AMAZON.COM INC. 1 Pesos 1 1850 1850 MAE`

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
              💡 Tip: Copie directamente desde Excel o tablas. El sistema detectará automáticamente el formato.
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
              <strong>Formatos soportados:</strong>
              <ul className="list-disc list-inside mt-1 text-sm">
                <li>Datos copiados directamente de Excel/tablas</li>
                <li>Texto separado por espacios múltiples</li>
                <li>Texto separado por tabulaciones</li>
                <li>Cada línea debe terminar con BYMA, MAV o MAE</li>
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

      {/* Vista Previa de Datos */}
      {operaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Vista Previa de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <TitulosTable operaciones={operaciones} filtroMercado={filtroMercado} onFiltroChange={setFiltroMercado} />
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
            <div className="flex gap-3">
              <Button onClick={generarExcel} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {isProcessing ? "Generando..." : "Generar Archivos Excel"}
              </Button>

              <Button
                onClick={() => setShowEmailModal(true)}
                disabled={Object.keys(excelFiles).length === 0}
                className="bg-blue-600 hover:bg-blue-700"
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
                  ✅ Listos para enviar por email. Haga clic en "Previsualizar Emails" para continuar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
