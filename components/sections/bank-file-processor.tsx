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
import {
  Building2,
  Download,
  Plus,
  Trash2,
  Upload,
  Calculator,
  CreditCard,
  ArrowRight,
  AlertCircle,
  Search,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BANK_CONFIGS, CBU_PRESETS, CUENTAS_ORIGEN_POR_BANCO } from "@/lib/bank-config"
import { generateBankFile, type TransferData, type EcheckData } from "@/lib/file-generators"
import { getCuitByComitente } from "@/lib/comitente-lookup"

interface EcheckEntry {
  id: string
  cuitBeneficiario: string
  importe: number
  referencia: string
  fechaPago: string
  email?: string
  numeroComitente?: string // Agregar para tracking
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
    montoMaximo: 700000000, // Precargado con 700.000.000
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
  const [bulkEcheckFormat, setBulkEcheckFormat] = useState<"ordenes-pago" | "confirmacion-solicitudes" | "">("")

  const { toast } = useToast()

  // Función para formatear números con separadores de miles (solo para mostrar)
  const formatNumber = (value: number): string => {
    return value.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Obtener configuración del banco seleccionado
  const bankConfig = selectedBank ? BANK_CONFIGS[selectedBank] : null

  // Obtener CBUs disponibles para el tipo de transferencia seleccionado
  const availableCBUs =
    transferData.tipoTransferencia && selectedBank
      ? CBU_PRESETS[transferData.tipoTransferencia]?.[selectedBank] || []
      : []

  // Obtener cuentas origen disponibles según el banco seleccionado
  const availableOriginAccounts = selectedBank ? CUENTAS_ORIGEN_POR_BANCO[selectedBank] || [] : []

  // Manejar selección de banco
  const handleBankChange = (bank: string) => {
    setSelectedBank(bank)
    setSelectedFileType("")
    setShowTransferForm(false)
    setTransferData((prev) => ({
      ...prev,
      banco: bank,
      tipoTransferencia: "",
      cuentaOrigen: "",
      cbuDestino: "",
    }))

    // Auto-seleccionar E-check si el banco solo soporta E-checks
    const config = BANK_CONFIGS[bank]
    if (config && !config.supportsTransfer && config.supportsEcheck) {
      setSelectedFileType("echeck")
    }
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
  const processBulkEchecks = async () => {
    if (!bulkEcheckText.trim() || !bulkEcheckFormat) {
      toast({
        title: "Datos requeridos",
        description: "Seleccione el formato e ingrese los datos de los e-checks",
        variant: "destructive",
      })
      return
    }

    try {
      const lines = bulkEcheckText.trim().split("\n")
      const newEchecks: EcheckEntry[] = []
      let cuitLookupCount = 0

      // Saltar la primera línea (header)
      const dataLines = lines.slice(1)

      if (bulkEcheckFormat === "ordenes-pago") {
        // Formato: Estado	Comitente (Número)	Comitente (Denominación)	Moneda (Descripción)	Importe	Comitente (CUIT)	Modalidad de Pago	Oficial de Cuenta
        for (let index = 0; index < dataLines.length; index++) {
          const line = dataLines[index]
          const parts = line.split("\t").map((part) => part.trim())

          if (parts.length >= 6 && parts[0] === "Liquidada" && parts[6] === "Echeq") {
            // Limpiar el importe (remover puntos de miles y reemplazar coma por punto)
            const importeStr = parts[4].replace(/\./g, "").replace(",", ".")
            const importe = Number.parseFloat(importeStr) || 0

            let cuit = parts[5] // Comitente (CUIT)
            const numeroComitente = parts[1] // Comitente (Número)

            // Si no hay CUIT, buscar por número de comitente
            if (!cuit || cuit.trim() === "") {
              console.log(`Buscando CUIT para comitente ${numeroComitente}...`)
              const cuitEncontrado = await getCuitByComitente(numeroComitente)
              if (cuitEncontrado) {
                cuit = cuitEncontrado
                cuitLookupCount++
                console.log(`✅ CUIT encontrado: ${cuit}`)
              } else {
                console.warn(`❌ No se encontró CUIT para comitente ${numeroComitente}`)
                cuit = "00000000000" // CUIT por defecto
              }
            }

            newEchecks.push({
              id: `${Date.now()}-${index}`,
              cuitBeneficiario: cuit,
              importe: importe,
              referencia: parts[2], // Comitente (Denominación)
              fechaPago: new Date().toISOString().split("T")[0], // Fecha actual
              email: "",
              numeroComitente: numeroComitente,
            })
          }
        }
      } else if (bulkEcheckFormat === "confirmacion-solicitudes") {
        // Formato: Fecha de Concertación	Comitente (Número)	Comitente (Descripción)	Moneda	Importe	CBU	CUIT	Banco	Forma de Pago (Echeq)	Número de Referencia	Estado	Forma de Pago (Descripción)	Hora de Ingreso
        for (let index = 0; index < dataLines.length; index++) {
          const line = dataLines[index]
          const parts = line.split("\t").map((part) => part.trim())

          if (parts.length >= 11 && parts[10] === "Aprobada" && parts[8] === "-1") {
            // Limpiar el importe (remover puntos de miles y reemplazar coma por punto)
            const importeStr = parts[4].replace(/\./g, "").replace(",", ".")
            const importe = Number.parseFloat(importeStr) || 0

            // Convertir fecha de formato DD/M/YYYY a YYYY-MM-DD
            const fechaConcertacion = parts[0]
            let fechaFormateada = new Date().toISOString().split("T")[0] // Default a hoy

            try {
              const [dia, mes, año] = fechaConcertacion.split("/")
              fechaFormateada = `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`
            } catch (error) {
              console.warn("Error al parsear fecha:", fechaConcertacion)
            }

            let cuit = parts[6] || "" // CUIT del campo correspondiente
            const numeroComitente = parts[1] // Comitente (Número)

            // Si no hay CUIT, buscar por número de comitente
            if (!cuit || cuit.trim() === "") {
              console.log(`Buscando CUIT para comitente ${numeroComitente}...`)
              const cuitEncontrado = await getCuitByComitente(numeroComitente)
              if (cuitEncontrado) {
                cuit = cuitEncontrado
                cuitLookupCount++
                console.log(`✅ CUIT encontrado: ${cuit}`)
              } else {
                console.warn(`❌ No se encontró CUIT para comitente ${numeroComitente}`)
                cuit = "00000000000" // CUIT por defecto
              }
            }

            newEchecks.push({
              id: `${Date.now()}-${index}`,
              cuitBeneficiario: cuit,
              importe: importe,
              referencia: parts[2], // Comitente (Descripción)
              fechaPago: fechaFormateada, // Fecha de Concertación
              email: "",
              numeroComitente: numeroComitente,
            })
          }
        }
      }

      setEcheckEntries((prev) => [...prev, ...newEchecks])
      setBulkEcheckText("")
      setBulkEcheckFormat("")
      setShowBulkEcheckDialog(false)

      toast({
        title: "E-checks procesados",
        description: `Se agregaron ${newEchecks.length} e-checks. ${cuitLookupCount > 0 ? `Se buscaron ${cuitLookupCount} CUITs por número de comitente.` : ""}`,
      })
    } catch (error) {
      toast({
        title: "Error al procesar",
        description:
          "Verifique el formato de los datos. Asegúrese de incluir el header y que los datos estén separados por tabulaciones.",
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
                  {bankConfig?.supportsTransfer && <SelectItem value="transferencia">Transferencia</SelectItem>}
                  {bankConfig?.supportsEcheck && <SelectItem value="echeck">E-check</SelectItem>}
                </SelectContent>
              </Select>
              {bankConfig && !bankConfig.supportsTransfer && bankConfig.supportsEcheck && (
                <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Este banco solo soporta E-checks</span>
                </div>
              )}
              {bankConfig && !bankConfig.supportsEcheck && bankConfig.supportsTransfer && (
                <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Este banco solo soporta Transferencias</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Transferencias */}
      {showTransferForm && bankConfig?.supportsTransfer && (
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
                    {availableOriginAccounts.map((cuenta) => (
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
                  onValueChange={(value) =>
                    setTransferData((prev) => ({ ...prev, tipoTransferencia: value, cbuDestino: "" }))
                  }
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
                    {selectedBank === "banco-comafi" && (
                      <>
                        <SelectItem value="MEP-DL0">MEP - DL0</SelectItem>
                        <SelectItem value="MEP-GC1">MEP - GC1</SelectItem>
                        <SelectItem value="MEP-D20">MEP - D20</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>CBU/Cuenta Destino</Label>
              <div className="space-y-2">
                {availableCBUs.length > 0 ? (
                  <Select
                    value={transferData.cbuDestino}
                    onValueChange={(value) => setTransferData((prev) => ({ ...prev, cbuDestino: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCBUs.map((cuenta) => (
                        <SelectItem key={cuenta.value} value={cuenta.value}>
                          {cuenta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={transferData.cbuDestino}
                    onChange={(e) => setTransferData((prev) => ({ ...prev, cbuDestino: e.target.value }))}
                    placeholder="Ingrese CBU destino manualmente"
                  />
                )}
              </div>
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
                  placeholder="700000000.00"
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
                  Última transferencia:{" "}
                  {formatNumber(transferData.importeTotal % transferData.montoMaximo || transferData.montoMaximo)}
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
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Carga Masiva de E-checks con Búsqueda de CUIT
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">Búsqueda Automática de CUIT</span>
                        </div>
                        <p className="text-blue-600 text-sm mt-1">
                          Si no se informa CUIT en los datos, el sistema buscará automáticamente usando el número de
                          comitente en la base de datos.
                        </p>
                      </div>

                      <div>
                        <Label>Tipo de Formato</Label>
                        <Select
                          value={bulkEcheckFormat}
                          onValueChange={(value: "ordenes-pago" | "confirmacion-solicitudes") =>
                            setBulkEcheckFormat(value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar formato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ordenes-pago">Órdenes de Pago</SelectItem>
                            <SelectItem value="confirmacion-solicitudes">Confirmación de Solicitudes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {bulkEcheckFormat && (
                        <div>
                          <Label>Datos de E-checks</Label>
                          {bulkEcheckFormat === "ordenes-pago" ? (
                            <p className="text-sm text-gray-500 mb-2">
                              Pegue los datos copiados desde "Status Órdenes de Pago" (incluya el header con las
                              columnas)
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 mb-2">
                              Pegue los datos copiados desde "Confirmación de Solicitudes" (incluya el header con las
                              columnas).
                              <br />
                              <strong>Solo se procesarán:</strong> Estado = "Aprobada" y Forma de Pago (Echeq) = "-1"
                            </p>
                          )}
                          <Textarea
                            value={bulkEcheckText}
                            onChange={(e) => setBulkEcheckText(e.target.value)}
                            placeholder={
                              bulkEcheckFormat === "ordenes-pago"
                                ? "Estado\tComitente (Número)\tComitente (Denominación)\tMoneda (Descripción)\tImporte\tComitente (CUIT)\tModalidad de Pago\tOficial de Cuenta\nLiquidada\t1358\tTRANSPORTADORA DE GAS DEL SUR S.A.\tPesos\t5477538085\t30657862068\tEcheq\tSORUCO, JAVIER"
                                : "Fecha de Concertación\tComitente (Número)\tComitente (Descripción)\tMoneda\tImporte\tCBU\tCUIT\tBanco\tForma de Pago (Echeq)\tNúmero de Referencia\tEstado\tForma de Pago (Descripción)\tHora de Ingreso\n4/6/2025\t153709\tCONTEXTO ECONOMICO SRL\tPesos\t35701343,4\t\t\t\t-1\t#19914504\tAprobada\tBanco Comafi S.A. $\t4/6/2025"
                            }
                            rows={12}
                            className="font-mono text-sm"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button onClick={processBulkEchecks} className="flex-1" disabled={!bulkEcheckFormat}>
                          <Search className="w-4 h-4 mr-2" />
                          Procesar E-checks con Búsqueda
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
                        <TableHead>N° Comitente</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {echeckEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {entry.cuitBeneficiario}
                              {entry.numeroComitente && entry.cuitBeneficiario !== "00000000000" && (
                                <Badge variant="secondary" className="text-xs">
                                  <Search className="w-3 h-3 mr-1" />
                                  Auto
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatNumber(entry.importe)}</TableCell>
                          <TableCell>{entry.referencia}</TableCell>
                          <TableCell>{entry.fechaPago}</TableCell>
                          <TableCell>{entry.numeroComitente || "-"}</TableCell>
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
                      Total: {formatNumber(echeckEntries.reduce((sum, entry) => sum + entry.importe, 0))}
                    </Badge>
                    <Badge variant="outline" className="text-blue-600">
                      <Search className="w-3 h-3 mr-1" />
                      {echeckEntries.filter((e) => e.numeroComitente && e.cuitBeneficiario !== "00000000000").length}{" "}
                      CUITs encontrados
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
