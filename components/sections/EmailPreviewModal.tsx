"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Paperclip, ExternalLink, X, Download, Copy, Info } from "lucide-react"
import { MERCADO_CONFIG, EMAIL_TEMPLATE } from "@/lib/titulos-config"
import { getFileName } from "@/lib/titulos-excel"
import { useToast } from "@/hooks/use-toast"

interface EmailData {
  destinatarios: string
  asunto: string
  mensaje: string
}

interface EmailPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  excelFiles: Record<string, Blob>
  operacionesSummary: Record<string, number>
}

export default function EmailPreviewModal({ isOpen, onClose, excelFiles, operacionesSummary }: EmailPreviewModalProps) {
  const { toast } = useToast()

  // Estado para cada email
  const [emailsData, setEmailsData] = useState<Record<string, EmailData>>(() => {
    const initial: Record<string, EmailData> = {}
    Object.keys(MERCADO_CONFIG).forEach((mercado) => {
      const config = MERCADO_CONFIG[mercado]
      initial[mercado] = {
        destinatarios: config.destinatarios,
        asunto: config.asunto,
        mensaje: EMAIL_TEMPLATE,
      }
    })
    return initial
  })

  const [activeTab, setActiveTab] = useState("BYMA")

  const updateEmailData = (mercado: string, field: keyof EmailData, value: string) => {
    setEmailsData((prev) => ({
      ...prev,
      [mercado]: {
        ...prev[mercado],
        [field]: value,
      },
    }))
  }

  const getFileSize = (blob: Blob): string => {
    const sizeInKB = (blob.size / 1024).toFixed(1)
    return `${sizeInKB} KB`
  }

  const downloadFile = (mercado: string) => {
    const fileName = getFileName(mercado)
    const fileBlob = excelFiles[mercado]

    if (!fileBlob) {
      toast({
        title: "Error",
        description: "No se encontró el archivo Excel para este mercado",
        variant: "destructive",
      })
      return
    }

    // Crear URL del blob y descargar
    const fileUrl = URL.createObjectURL(fileBlob)
    const downloadLink = document.createElement("a")
    downloadLink.href = fileUrl
    downloadLink.download = fileName
    downloadLink.style.display = "none"
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    URL.revokeObjectURL(fileUrl)

    toast({
      title: "Archivo descargado",
      description: `${fileName} se descargó correctamente`,
    })
  }

  const copyEmailData = (mercado: string) => {
    const emailData = emailsData[mercado]
    const emailText = `Para: ${emailData.destinatarios}
CC: operaciones@ad-cap.com.ar
Asunto: ${emailData.asunto}

${emailData.mensaje}`

    navigator.clipboard.writeText(emailText).then(() => {
      toast({
        title: "Email copiado",
        description: "Los datos del email se copiaron al portapapeles",
      })
    })
  }

  // Función que abre los emails con CC incluido y delay de 1 segundo
  const openInOutlook = async (mercado: string) => {
    const emailData = emailsData[mercado]

    // Construir mailto link con CC a operaciones@ad-cap.com.ar
    const subject = encodeURIComponent(emailData.asunto)
    const body = encodeURIComponent(emailData.mensaje.replace(/<p>/g, "\n\n"))
    const to = encodeURIComponent(emailData.destinatarios)
    const cc = encodeURIComponent("operaciones@ad-cap.com.ar")

    const mailtoLink = `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`

    // Abrir Outlook
    window.open(mailtoLink, "_blank")

    // También descargar el archivo
    downloadFile(mercado)

    toast({
      title: "Email abierto y archivo descargado",
      description: `Se abrió Outlook con CC a operaciones@ad-cap.com.ar y se descargó ${getFileName(mercado)}. Adjunte manualmente el archivo descargado.`,
    })

    // Delay de 1 segundo
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const mercadosConDatos = Object.keys(excelFiles).filter((mercado) => operacionesSummary[mercado] > 0)

  if (mercadosConDatos.length === 0) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Previsualización y Edición de Emails
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Información importante sobre adjuntos */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Nota sobre adjuntos:</strong> Por seguridad, los navegadores no permiten adjuntar archivos
            automáticamente a emails. Los archivos Excel se descargarán automáticamente y deberás adjuntarlos
            manualmente en Outlook. Todos los emails incluyen CC a operaciones@ad-cap.com.ar.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            {mercadosConDatos.map((mercado) => {
              const config = MERCADO_CONFIG[mercado]
              const count = operacionesSummary[mercado]
              return (
                <TabsTrigger key={mercado} value={mercado} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                  {mercado} ({count} ops)
                </TabsTrigger>
              )
            })}
          </TabsList>

          {mercadosConDatos.map((mercado) => {
            const config = MERCADO_CONFIG[mercado]
            const emailData = emailsData[mercado]
            const fileName = getFileName(mercado)
            const fileSize = excelFiles[mercado] ? getFileSize(excelFiles[mercado]) : "0 KB"

            return (
              <TabsContent key={mercado} value={mercado} className="space-y-6">
                {/* Información del archivo adjunto */}
                <div className={`${config.bgColor} p-4 rounded-lg border`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Paperclip className="w-4 h-4" />
                    <span className="font-medium">Archivo para Adjuntar</span>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <Badge variant="outline" className="font-mono">
                      {fileName}
                    </Badge>
                    <Badge variant="secondary">{fileSize}</Badge>
                    <Badge className={`${config.bgColor} ${config.textColor}`}>
                      {operacionesSummary[mercado]} operaciones
                    </Badge>
                  </div>
                  <Button onClick={() => downloadFile(mercado)} size="sm" variant="outline" className="bg-white">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Archivo
                  </Button>
                </div>

                {/* Campos del email */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`para-${mercado}`}>Para:</Label>
                    <Input
                      id={`para-${mercado}`}
                      value={emailData.destinatarios}
                      onChange={(e) => updateEmailData(mercado, "destinatarios", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`cc-${mercado}`}>CC:</Label>
                    <Input
                      id={`cc-${mercado}`}
                      value="operaciones@ad-cap.com.ar"
                      disabled
                      className="font-mono text-sm bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">CC fijo incluido automáticamente</p>
                  </div>

                  <div>
                    <Label htmlFor={`asunto-${mercado}`}>Asunto:</Label>
                    <Input
                      id={`asunto-${mercado}`}
                      value={emailData.asunto}
                      onChange={(e) => updateEmailData(mercado, "asunto", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`mensaje-${mercado}`}>Mensaje:</Label>
                    <Textarea
                      id={`mensaje-${mercado}`}
                      value={emailData.mensaje}
                      onChange={(e) => updateEmailData(mercado, "mensaje", e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Vista previa del Excel */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">📊 Vista Previa del Excel</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>• A1: Clientes operaciones diarias</div>
                    <div>• A2: Agente CNV N° | B2: {config.agenteCNV}</div>
                    <div>• A3: Agente | B3: {config.agente}</div>
                    <div>• A4: Denominación del Agente: | B4: ADCAP SECURITIES ARGENTINA S.A.</div>
                    <div>
                      • A5: Fecha de Concertacion: | B5:{" "}
                      {new Date().toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    <div>
                      • Datos desde fila 6: {operacionesSummary[mercado]} operaciones {mercado}
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                  <Button onClick={() => openInOutlook(mercado)} className="bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir en Outlook
                  </Button>

                  <Button onClick={() => copyEmailData(mercado)} variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Email
                  </Button>

                  <Button onClick={() => downloadFile(mercado)} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Excel
                  </Button>
                </div>

                {/* Instrucciones */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pasos para enviar:</strong>
                    <ol className="list-decimal list-inside mt-1 text-sm space-y-1">
                      <li>
                        Haz clic en "Abrir en Outlook" (se abrirá el email con CC incluido y descargará el archivo)
                      </li>
                      <li>En Outlook, haz clic en "Adjuntar archivo" o el ícono 📎</li>
                      <li>Selecciona el archivo {fileName} que se descargó</li>
                      <li>Verifica que operaciones@ad-cap.com.ar esté en CC</li>
                      <li>Envía el email</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </TabsContent>
            )
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
