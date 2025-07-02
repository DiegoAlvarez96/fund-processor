"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, Mail, Trash2, FileText, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { TituloOperacion } from "@/lib/titulos-parser"
import { parseTitulosData, getMercadoSummary } from "@/lib/titulos-parser"
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

  const { toast } = useToast()

  // Procesar datos pegados
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
      const operacionesParsed = parseTitulosData(rawData)

      if (operacionesParsed.length === 0) {
        toast({
          title: "Sin operaciones válidas",
          description: "No se encontraron operaciones válidas en los datos proporcionados",
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
        title: "Datos procesados",
        description: `Se procesaron ${totalOps} operaciones: BYMA(${summary.BYMA}), MAV(${summary.MAV}), MAE(${summary.MAE})`,
      })
    } catch (error) {
      console.error("❌ Error procesando datos:", error)
      toast({
        title: "Error al procesar",
        description: "Verifique el formato de los datos. Deben estar separados por espacios o tabulaciones.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
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

  // Limpiar todo
  const limpiarTodo = () => {
    setRawData("")
    setOperaciones([])
    setExcelFiles({})
    setFiltroMercado("todos")
    toast({
      title: "Datos limpiados",
      description: "Se eliminaron todos los datos y archivos",
    })
  }

  // Obtener resumen por mercado
  const mercadoSummary = getMercadoSummary(operaciones)
  const totalOperaciones = Object.values(mercadoSummary).reduce((sum, count) => sum + count, 0)

  // Ejemplo de formato
  const ejemploFormato = `Denominación Cliente Nº CUIT / CUIL / CIE/ CDI Especie Plazo Moneda Cantidad Comprada Precio Promedio Compra Monto Comprado Cantidad Vendida Precio Promedio Venta Monto Vendido Mercado
SUCIC, MICAELA ELIANA 2,73E+10 BONO NACION ARG.U$S STEP UP 2030 LA 0 Dolar MEP (Local) 1529 0,683897 1045,68 BYMA
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
          <div>
            <label className="block text-sm font-medium mb-2">
              Pegue aquí los datos de operaciones (separados por espacios/tabulaciones):
            </label>
            <Textarea
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder={ejemploFormato}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={procesarDatos} disabled={isProcessing || !rawData.trim()}>
              🔄 Procesar Datos
            </Button>
            <Button variant="outline" onClick={() => setRawData("")} disabled={!rawData.trim()}>
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
