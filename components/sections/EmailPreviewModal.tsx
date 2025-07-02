"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Paperclip, ExternalLink, X } from "lucide-react"
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

  const openInOutlook = (mercado: string) => {
    const emailData = emailsData[mercado]
    const fileName = getFileName(mercado)

    // Crear URL del archivo para adjuntar
    const fileBlob = excelFiles[mercado]
    if (!fileBlob) {
      toast({
        title: "Error",
        description: "No se encontró el archivo Excel para este mercado",
        variant: "destructive",
      })
      return
    }

    // Crear URL del blob
    const fileUrl = URL.createObjectURL(fileBlob)

    // Construir mailto link
    const subject = encodeURIComponent(emailData.asunto)
    const body = encodeURIComponent(emailData.mensaje.replace(/<p>/g, "\n\n"))
    const to = encodeURIComponent(emailData.destinatarios)

    // Crear un formulario temporal para enviar el archivo
    const form = document.createElement("form")
    form.method = "POST"
    form.enctype = "multipart/form-data"
    form.style.display = "none"

    // Crear input para el archivo
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.name = "attachment"

    // Convertir blob a file
    const file = new File([fileBlob], fileName, { type: fileBlob.type })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.files = dataTransfer.files

    form.appendChild(fileInput)
    document.body.appendChild(form)

    // Abrir Outlook con el archivo adjunto
    const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}&attachment=${fileName}`

    // Intentar abrir con el archivo adjunto
    try {
      // Crear un enlace temporal que incluya el archivo
      const tempLink = document.createElement("a")
      tempLink.href = fileUrl
      tempLink.download = fileName
      tempLink.style.display = "none"
      document.body.appendChild(tempLink)

      // Descargar el archivo primero
      tempLink.click()

      // Luego abrir el email
      setTimeout(() => {
        window.open(mailtoLink, "_blank")
        document.body.removeChild(tempLink)
        document.body.removeChild(form)

        toast({
          title: "Email y archivo preparados",
          description: `Se descargó ${fileName} y se abrió Outlook. Adjunte manualmente el archivo descargado.`,
        })
      }, 500)
    } catch (error) {
      console.error("Error al preparar email:", error)

      // Fallback: solo descargar archivo y abrir email
      const downloadLink = document.createElement("a")
      downloadLink.href = fileUrl
      downloadLink.download = fileName
      downloadLink.style.display = "none"
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      window.open(mailtoLink, "_blank")

      toast({
        title: "Email abierto",
        description: `Se descargó ${fileName}. Adjunte manualmente el archivo al email.`,
        variant: "destructive",
      })
    }

    // Limpiar URL después de un tiempo
    setTimeout(() => {
      URL.revokeObjectURL(fileUrl)
    }, 2000)
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
                    <span className="font-medium">Archivo Adjunto</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="font-mono">
                      {fileName}
                    </Badge>
                    <Badge variant="secondary">{fileSize}</Badge>
                    <Badge className={`${config.bgColor} ${config.textColor}`}>
                      {operacionesSummary[mercado]} operaciones
                    </Badge>
                  </div>
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
                <div className="flex gap-3 pt-4">
                  <Button onClick={() => openInOutlook(mercado)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir en Outlook
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
