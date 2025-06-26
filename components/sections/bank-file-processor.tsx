"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Download, Plus, Trash2, Upload, Calculator, CreditCard, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BANK_CONFIGS, CBU_PRESETS, CUENTAS_ORIGEN } from "@/lib/bank-config"
import { generateBankFile, type TransferData, type EcheckData } from "@/lib/file-generators"

interface EcheckEntry {
  id: string
  cuitBeneficiario: string
  importe: number
  referencia: string
  fechaPago: string
  email?: string
}

export default function BankFileProcessor() {
  const [selectedBank, setSelectedBank] = useState("")
  const [selectedFileType, setSelectedFileType] = useState("")
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [showEcheckDialog, setShowEcheckDialog] = useState(false)
  const [showBulkEcheckDialog, setShowBulkEcheckDialog] = useState(false)

  // Estados para transferencias
  const [transferData, setTransferData] = useState<TransferData>({
    cuentaOrigen: "",
    cbuDestino: "",
    importeTotal: 0,
    montoMaximo: 0,
    tipoTransferencia: "",
    banco: "",
  })

  // Estados para e-checks
  const [echeckEntries, setEcheckEntries] = useState<EcheckEntry[]>([])
  const [newEcheck, setNewEcheck] = useState<Omit<EcheckEntry, "id">>({
    cuitBeneficiario: "",
    importe: 0,
    referencia: "",
    fechaPago: "",
    email: "",
  })
  const [bulkEcheckText, setBulkEcheckText] = useState("")

  const { toast } = useToast()

  // Obtener configuración del banco seleccionado
  const bankConfig = selectedBank ? BANK_CONFIGS[selectedBank] : null

  // Obtener CBUs disponibles para el tipo de transferencia seleccionado
  const availableCBUs =
    transferData.tipoTransferencia && selectedBank
      ? CBU_PRESETS[transferData.tipoTransferencia]?.[selectedBank] || []
      : []

  // Manejar selección de banco
  const handleBankChange = (bank: string) => {
    setSelectedBank(bank)
    setSelectedFileType("")
    setShowTransferForm(false)
    setTransferData((prev) => ({ ...prev, banco: bank, tipoTransferencia: "" }))
  }

  // Manejar selección de tipo de archivo
  const handleFileTypeChange = (fileType: string) => {
    setSelectedFileType(fileType)
    setShowTransferForm(fileType === "transferencia")
  }

  // Generar archivo de transferencias
  const generateTransferFile = () => {
    if (
      !transferData.cuentaOrigen ||
      !transferData.cbuDestino ||
      !transferData.importeTotal ||
      !transferData.montoMaximo
    ) {
      toast({
        title: "Campos requeridos",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      const { content, filename, mimeType } = generateBankFile(selectedBank, "transferencia", transferData)

      // Descargar archivo
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Archivo generado",
        description: `Se generó el archivo ${filename} con ${Math.ceil(transferData.importeTotal / transferData.montoMaximo)} transferencias`,
      })
    } catch (error) {
      toast({
        title: "Error al generar archivo",
        description: "Ocurrió un error al generar el archivo",
        variant: "destructive",
      })
    }
  }

  // Agregar e-check individual
  const addEcheck = () => {
    if (!newEcheck.cuitBeneficiario || !newEcheck.importe || !newEcheck.referencia || !newEcheck.fechaPago) {
      toast({
        title: "Campos requeridos",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    const echeck: EcheckEntry = {
      id: Date.now().toString(),
      ...newEcheck,
    }

    setEcheckEntries((prev) => [...prev, echeck])
    setNewEcheck({
      cuitBeneficiario: "",
      importe: 0,
      referencia: "",
      fechaPago: "",
      email: "",
    })
    setShowEcheckDialog(false)

    toast({
      title: "E-check agregado",
      description: "El e-check se agregó correctamente",
    })
  }

  // Procesar e-checks masivos desde texto
  const processBulkEchecks = () => {
    if (!bulkEcheckText.trim()) {
      toast({
        title: "Texto requerido",
        description: "Ingrese los datos de los e-checks",
        variant: "destructive",
      })
      return
    }

    try {
      const lines = bulkEcheckText.trim().split("\n")
      const newEchecks: EcheckEntry[] = []

      lines.forEach((line, index) => {
        const parts = line.split(";").map((part) => part.trim())
        if (parts.length >= 4) {
          newEchecks.push({
            id: `${Date.now()}-${index}`,
            cuitBeneficiario: parts[0],
            importe: Number.parseFloat(parts[1]) || 0,
            referencia: parts[2],
            fechaPago: parts[3],
            email: parts[4] || "",
          })
        }
      })

      setEcheckEntries((prev) => [...prev, ...newEchecks])
      setBulkEcheckText("")
      setShowBulkEcheckDialog(false)

      toast({
        title: "E-checks procesados",
        description: `Se agregaron ${newEchecks.length} e-checks`,
      })
    } catch (error) {
      toast({
        title: "Error al procesar",
        description: "Verifique el formato de los datos",
        variant: "destructive",
      })
    }
  }

  // Generar archivo de e-checks
  const generateEcheckFile = () => {
    if (echeckEntries.length === 0) {
      toast({
        title: "Sin e-checks",
        description: "Agregue al menos un e-check",
        variant: "destructive",
      })
      return
    }

    try {
      const echeckData: EcheckData[] = echeckEntries.map((entry) => ({
        cuitBeneficiario: entry.cuitBeneficiario,
        importe: entry.importe,
        referencia: entry.referencia,
        fechaPago: entry.fechaPago,
        email: entry.email,
        banco: selectedBank,
      }))

      const { content, filename, mimeType } = generateBankFile(selectedBank, "echeck", echeckData)

      // Descargar archivo
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Archivo generado",
        description: `Se generó el archivo ${filename} con ${echeckEntries.length} e-checks`,
      })
    } catch (error) {
      toast({
        title: "Error al generar archivo",
        description: "Ocurrió un error al generar el archivo",
        variant: "destructive",
      })
    }
  }

  // Eliminar e-check
  const removeEcheck = (id: string) => {
    setEcheckEntries((prev) => prev.filter((entry) => entry.id !== id))
    toast({
      title: "E-check eliminado",
      description: "El e-check se eliminó correctamente",
    })
  }

  // Limpiar todos los e-checks
  const clearEchecks = () => {
    setEcheckEntries([])
    toast({
      title: "E-checks limpiados",
      description: "Se eliminaron todos los e-checks",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Procesador de Archivos Bancarios</h1>
        <p className="text-gray-600">Genera archivos de transferencias y e-checks para diferentes bancos</p>
      </div>

      {/* Selección de Banco y Tipo de Archivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Configuración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Banco</Label>
              <Select value={selectedBank} onValueChange={handleBankChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banco-valores">Banco de Valores (txt)</SelectItem>
                  <SelectItem value="banco-comafi">Banco Comafi (csv)</SelectItem>
                  <SelectItem value="banco-comercio">Banco de Comercio (txt)</SelectItem>
                  <SelectItem value="banco-bind">Banco BIND (csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Archivo</Label>
              <Select value={selectedFileType} onValueChange={handleFileTypeChange} disabled={!selectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  {bankConfig?.supportsEcheck && <SelectItem value="echeck">E-check</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Transferencias */}
      {showTransferForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Configuración de Transferencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cuenta Origen</Label>
                <Select
                  value={transferData.cuentaOrigen}
                  onValueChange={(value) => setTransferData((prev) => ({ ...prev, cuentaOrigen: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUENTAS_ORIGEN.map((cuenta) => (
                      <SelectItem key={cuenta.value} value={cuenta.value}>
                        {cuenta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Transferencia</Label>
                <Select
                  value={transferData.tipoTransferencia}
                  onValueChange={(value) => setTransferData((prev) => ({ ...prev, tipoTransferencia: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inmediata">Inmediata</SelectItem>
                    <SelectItem value="mismo-banco">Mismo Banco</SelectItem>
                    {selectedBank === "banco-valores" && (
                      <>
                        <SelectItem value="MEP-DL0">MEP - DL0</SelectItem>
                        <SelectItem value="MEP-GC1">MEP - GC1</SelectItem>
                        <SelectItem value="MEP-D20">MEP - D20</SelectItem>
                      </>
                    )}
                    {selectedBank === "banco-comafi" && <SelectItem value="MEP-DL0">MEP - DL0</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>CBU Destino</Label>
              {availableCBUs.length > 0 ? (
                <Select
                  value={transferData.cbuDestino}
                  onValueChange={(value) => setTransferData((prev) => ({ ...prev, cbuDestino: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar CBU destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCBUs.map((cbu) => (
                      <SelectItem key={cbu} value={cbu}>
                        {cbu}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={transferData.cbuDestino}
                  onChange={(e) => setTransferData((prev) => ({ ...prev, cbuDestino: e.target.value }))}
                  placeholder="Ingrese CBU destino"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Importe Total a Transferir</Label>
                <Input
                  type="number"
                  value={transferData.importeTotal || ""}
                  onChange={(e) =>
                    setTransferData((prev) => ({ ...prev, importeTotal: Number.parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Monto Máximo por Transferencia</Label>
                <Input
                  type="number"
                  value={transferData.montoMaximo || ""}
                  onChange={(e) =>
                    setTransferData((prev) => ({ ...prev, montoMaximo: Number.parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {transferData.importeTotal > 0 && transferData.montoMaximo > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Calculator className="w-4 h-4" />
                  <span className="font-medium">Resumen de Transferencias</span>
                </div>
                <p className="text-blue-600 mt-1">
                  Se generarán <strong>{Math.ceil(transferData.importeTotal / transferData.montoMaximo)}</strong>{" "}
                  transferencias
                </p>
                <p className="text-blue-600 text-sm">
                  Última transferencia: $
                  {(transferData.importeTotal % transferData.montoMaximo || transferData.montoMaximo).toFixed(2)}
                </p>
              </div>
            )}

            <Button onClick={generateTransferFile} className="w-full bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Generar Archivo de Transferencias
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sección de E-checks */}
      {selectedFileType === "echeck" && bankConfig?.supportsEcheck && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Gestión de E-checks
              </CardTitle>
              <div className="flex gap-2">
                <Dialog open={showEcheckDialog} onOpenChange={setShowEcheckDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar E-check
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar E-check Individual</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>CUIT Beneficiario</Label>
                        <Input
                          value={newEcheck.cuitBeneficiario}
                          onChange={(e) => setNewEcheck((prev) => ({ ...prev, cuitBeneficiario: e.target.value }))}
                          placeholder="30-12345678-9"
                        />
                      </div>
                      <div>
                        <Label>Importe</Label>
                        <Input
                          type="number"
                          value={newEcheck.importe || ""}
                          onChange={(e) =>
                            setNewEcheck((prev) => ({ ...prev, importe: Number.parseFloat(e.target.value) || 0 }))
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Referencia</Label>
                        <Input
                          value={newEcheck.referencia}
                          onChange={(e) => setNewEcheck((prev) => ({ ...prev, referencia: e.target.value }))}
                          placeholder="Descripción del pago"
                        />
                      </div>
                      <div>
                        <Label>Fecha de Pago</Label>
                        <Input
                          type="date"
                          value={newEcheck.fechaPago}
                          onChange={(e) => setNewEcheck((prev) => ({ ...prev, fechaPago: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Email (opcional)</Label>
                        <Input
                          type="email"
                          value={newEcheck.email}
                          onChange={(e) => setNewEcheck((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="email@ejemplo.com"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={addEcheck} className="flex-1">
                          Agregar
                        </Button>
                        <Button variant="outline" onClick={() => setShowEcheckDialog(false)} className="flex-1">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showBulkEcheckDialog} onOpenChange={setShowBulkEcheckDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Carga Masiva
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Carga Masiva de E-checks</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Datos de E-checks</Label>
                        <p className="text-sm text-gray-500 mb-2">
                          Formato: CUIT;Importe;Referencia;Fecha;Email (uno por línea)
                        </p>
                        <Textarea
                          value={bulkEcheckText}
                          onChange={(e) => setBulkEcheckText(e.target.value)}
                          placeholder="30123456789;150000.00;DESCRIPCION DEL COMITENTE;2025-01-30;email@ejemplo.com"
                          rows={10}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={processBulkEchecks} className="flex-1">
                          Procesar E-checks
                        </Button>
                        <Button variant="outline" onClick={() => setShowBulkEcheckDialog(false)} className="flex-1">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {echeckEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay e-checks cargados</p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>CUIT Beneficiario</TableHead>
                        <TableHead>Importe</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Fecha de Pago</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {echeckEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.cuitBeneficiario}</TableCell>
                          <TableCell>${entry.importe.toFixed(2)}</TableCell>
                          <TableCell>{entry.referencia}</TableCell>
                          <TableCell>{entry.fechaPago}</TableCell>
                          <TableCell>{entry.email || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEcheck(entry.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{echeckEntries.length} e-checks</Badge>
                    <Badge variant="outline">
                      Total: ${echeckEntries.reduce((sum, entry) => sum + entry.importe, 0).toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={clearEchecks} size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpiar Todo
                    </Button>
                    <Button onClick={generateEcheckFile} className="bg-green-600 hover:bg-green-700">
                      <Download className="w-4 h-4 mr-2" />
                      Generar Archivo E-checks
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
