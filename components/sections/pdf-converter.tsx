"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Upload, Download, AlertCircle } from "lucide-react"
import { convertirPdfLB, convertirPdfTitulosRF } from "@/lib/pdf-to-excel-converter"
import * as XLSX from "xlsx"

type ConversionType = "lb" | "titulos" | null

export default function PdfConverter() {
  const [conversionType, setConversionType] = useState<ConversionType>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
      toast({
        title: "Archivo seleccionado",
        description: `${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB`,
      })
    } else {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo PDF válido",
        variant: "destructive",
      })
    }
  }

  const handleConvert = async () => {
    if (!conversionType || !selectedFile) {
      toast({
        title: "Error",
        description: "Selecciona un tipo de conversión y un archivo PDF",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      let filas: any[] = []

      if (conversionType === "lb") {
        filas = await convertirPdfLB(selectedFile)
      } else {
        filas = await convertirPdfTitulosRF(selectedFile)
      }

      // Crear workbook
      const wb = XLSX.utils.book_new()
      const sheetName = conversionType === "lb" ? "LB_Detalle" : "TITULOS_RF"
      const ws = XLSX.utils.json_to_sheet(filas)

      // Ajustar ancho de columnas
      const maxWidth: { [key: string]: number } = {}
      filas.forEach((row) => {
        Object.keys(row).forEach((key) => {
          const val = row[key]?.toString() || ""
          maxWidth[key] = Math.max(maxWidth[key] || 0, val.length + 2)
        })
      })

      ws["!cols"] = Object.keys(ws).map((key) => ({
        wch: Math.min(maxWidth[key] || 12, 50),
      }))

      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      // Descargar
      const fileName = `${conversionType === "lb" ? "CHEQUES_PAGARES" : "TITULOS_RF"}_${new Date().toISOString().split("T")[0]}.xlsx`
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Conversión completada",
        description: `${filas.length} filas convertidas correctamente`,
      })

      // Limpiar
      setSelectedFile(null)
      setConversionType(null)
    } catch (error: any) {
      toast({
        title: "Error en la conversión",
        description: error.message || "Ocurrió un error al procesar el PDF",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector de tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setConversionType("lb")}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                conversionType === "lb"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <h3 className="font-semibold text-lg mb-1">CHEQUES / PAGARES → LB</h3>
              <p className="text-sm text-gray-600">
                Listados LB10, LB18 de Caja de Valores con estructura de cuenta/subcuenta
              </p>
            </button>

            <button
              onClick={() => setConversionType("titulos")}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                conversionType === "titulos"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <h3 className="font-semibold text-lg mb-1">TITULOS RF</h3>
              <p className="text-sm text-gray-600">
                Listados de Títulos Renta Fija con columnas detectadas automáticamente (1)-(6)
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Selector de archivo */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="pdf-input" />
            <label htmlFor="pdf-input" className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-semibold text-gray-700">Arrastra un PDF o haz clic para seleccionar</p>
              <p className="text-sm text-gray-500">Solo archivos PDF</p>
            </label>
          </div>

          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-blue-900">{selectedFile.name}</p>
              <p className="text-xs text-blue-700">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}

          {!conversionType && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">Selecciona un tipo de PDF antes de convertir</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón de conversión */}
      <Button
        onClick={handleConvert}
        disabled={!conversionType || !selectedFile || isProcessing}
        size="lg"
        className="w-full"
      >
        <Download className="w-4 h-4 mr-2" />
        {isProcessing ? "Procesando..." : "Convertir y Descargar"}
      </Button>
    </div>
  )
}
