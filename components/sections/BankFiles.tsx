"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, FileText, Building2, CheckCircle, XCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BankFile {
  id: string
  fileName: string
  bank: string
  fileType: string
  uploadDate: string
  status: "pending" | "processing" | "completed" | "error"
  recordCount: number
  totalAmount: string
}

const BANKS = ["Banco Nación", "Banco Provincia", "Banco Ciudad", "BBVA", "Santander", "Macro", "Galicia", "ICBC"]

const FILE_TYPES = ["Débitos Automáticos", "Transferencias", "Depósitos", "Extractos", "Conciliación"]

export default function BankFiles() {
  const [bankFiles, setBankFiles] = useState<BankFile[]>([])
  const [selectedBank, setSelectedBank] = useState("")
  const [selectedFileType, setSelectedFileType] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!selectedBank || !selectedFileType) {
      toast({
        title: "Campos requeridos",
        description: "Selecciona el banco y tipo de archivo antes de cargar",
        variant: "destructive",
      })
      return
    }

    // Simular procesamiento del archivo
    const newFile: BankFile = {
      id: `${Date.now()}`,
      fileName: file.name,
      bank: selectedBank,
      fileType: selectedFileType,
      uploadDate: new Date().toLocaleString(),
      status: "pending",
      recordCount: Math.floor(Math.random() * 1000) + 100,
      totalAmount: `$${(Math.random() * 1000000).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
    }

    setBankFiles((prev) => [newFile, ...prev])

    // Simular procesamiento
    setTimeout(() => {
      setBankFiles((prev) => prev.map((f) => (f.id === newFile.id ? { ...f, status: "processing" } : f)))

      setTimeout(() => {
        setBankFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id
              ? {
                  ...f,
                  status: Math.random() > 0.2 ? "completed" : "error",
                }
              : f,
          ),
        )
      }, 2000)
    }, 1000)

    toast({
      title: "Archivo cargado",
      description: `${file.name} se está procesando`,
    })

    // Limpiar selecciones
    setSelectedBank("")
    setSelectedFileType("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const processAllFiles = async () => {
    setIsProcessing(true)
    const pendingFiles = bankFiles.filter((f) => f.status === "pending")

    for (const file of pendingFiles) {
      setBankFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "processing" } : f)))

      await new Promise((resolve) => setTimeout(resolve, 1000))

      setBankFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? {
                ...f,
                status: Math.random() > 0.2 ? "completed" : "error",
              }
            : f,
        ),
      )
    }

    setIsProcessing(false)
    toast({
      title: "Procesamiento completado",
      description: `Se procesaron ${pendingFiles.length} archivos`,
    })
  }

  const downloadReport = (fileId: string) => {
    toast({
      title: "Descargando reporte",
      description: "El reporte se está generando...",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "processing":
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      error: "destructive",
    } as const

    const labels = {
      pending: "Pendiente",
      processing: "Procesando",
      completed: "Completado",
      error: "Error",
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Archivos Bancarios</h1>
        <p className="text-gray-600">Procesa y gestiona archivos de diferentes bancos</p>
      </div>

      {/* Formulario de carga */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Cargar Nuevo Archivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Banco</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar banco" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Archivo</Label>
              <Select value={selectedFileType} onValueChange={setSelectedFileType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedBank || !selectedFileType}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Cargar Archivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            title: "Total Archivos",
            value: bankFiles.length.toString(),
            icon: <FileText className="w-4 h-4" />,
            color: "text-blue-600",
          },
          {
            title: "Completados",
            value: bankFiles.filter((f) => f.status === "completed").length.toString(),
            icon: <CheckCircle className="w-4 h-4" />,
            color: "text-green-600",
          },
          {
            title: "En Proceso",
            value: bankFiles.filter((f) => f.status === "processing").length.toString(),
            icon: <Clock className="w-4 h-4" />,
            color: "text-blue-600",
          },
          {
            title: "Con Errores",
            value: bankFiles.filter((f) => f.status === "error").length.toString(),
            icon: <XCircle className="w-4 h-4" />,
            color: "text-red-600",
          },
        ].map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-full bg-gray-100 ${stat.color}`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de archivos */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Archivos Procesados</CardTitle>
            <Button
              onClick={processAllFiles}
              disabled={isProcessing || !bankFiles.some((f) => f.status === "pending")}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? "Procesando..." : "Procesar Pendientes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Archivo</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Monto Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      No hay archivos cargados
                    </TableCell>
                  </TableRow>
                ) : (
                  bankFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.fileName}</TableCell>
                      <TableCell>{file.bank}</TableCell>
                      <TableCell>{file.fileType}</TableCell>
                      <TableCell>{file.uploadDate}</TableCell>
                      <TableCell>{file.recordCount.toLocaleString()}</TableCell>
                      <TableCell>{file.totalAmount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(file.status)}
                          {getStatusBadge(file.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadReport(file.id)}
                          disabled={file.status !== "completed"}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
