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
import { Building2, Download, Plus, Trash2, Upload, Calculator, CreditCard, ArrowRight, AlertCircle } from 'lucide-react'
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
      const blob = ne
