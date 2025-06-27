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
import { Building2, Download, Plus, Trash2, Upload, Calculator, CreditCard, ArrowRight, AlertCircle, Search, RefreshCw, Info } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { BANK_CONFIGS, CBU_PRESETS, CUENTAS_ORIGEN_POR_BANCO, getCuitByCBU } from "@/lib/bank-config"
import { generateBankFile, type TransferData, type EcheckData } from "@/lib/file-generators"
import { getCuitByComitente, debugComitenteData } from "@/lib/comitente-lookup"

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

  // Función de debug para los datos (sin cache)
  const handleDebugData = async () => {
    await debugComitenteData()
    toast({
      title: "Debug ejecutado",
      description: "Revisa la consola del navegador para ver los datos frescos",
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

  // Obtener información del CBU seleccionado
  const selectedCBUInfo = transferData.cbuDestino && transferData.tipoTransferencia && selectedBank
    ? getCuitByCBU(transferData.tipoTransferencia, selectedBank, transferData.cbuDestino)
    : null

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
      let cuitFoundCount = 0

      console.log("🚀 Iniciando procesamiento masivo de e-checks...")
      console.log(`📊 Total líneas a procesar: ${lines.length - 1}`) // -1 por el header

      // Saltar la primera línea (header)
      const dataLines = lines.slice(1)

      if (bulkEcheckFormat === "ordenes-pago") {
        // Formato: Estado	Comitente (Número)	Comitente (Denominación)	Moneda (Descripción)	Importe	Comitente (CUIT)	Modalidad de Pago	Oficial de Cuenta
        for (let index = 0; index < dataLines.length; index++) {
          const line = dataLines[index]
          const parts = line.split("\t").map((part) => part.trim())

          console.log(`📋 Procesando línea ${index + 1}:`, parts)

          if (parts.length >= 6 && parts[0] === "Liquidada" && parts[6] === "Echeq") {
            // Limpiar el importe (remover puntos de miles y reemplazar coma por punto)
            const importeStr = parts[4].replace(/\./g, "").replace(",", ".")
            const importe = Number.parseFloat(importeStr) || 0

            let cuit = parts[5] // Comitente (CUIT)
            const numeroComitente = parts[1] // Comitente (Número)

            console.log(`🔍 Procesando comitente ${numeroComitente}, CUIT original: "${cuit}"`)

            // Si no hay CUIT, buscar por número de comitente
            if (!cuit || cuit.trim() === "" || cuit === "0") {
              console.log(`🔍 Buscando CUIT para comitente ${numeroComitente}...`)
              cuitLookupCount++

              const cuitEncontrado = await getCuitByComitente(numeroComitente)
              if (cuitEncontrado) {
                cuit = cuitEncontrado
                cuitFoundCount++
                console.log(`✅ CUIT encontrado: ${cuit}`)
              } else {
                console.warn(`❌ No se encontró CUIT para comitente ${numeroComitente}`)
                cuit = "00000000000" // CUIT por defecto
              }
            } else {
              console.log(`✅ CUIT ya informado: ${cuit}`)
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

          console.log(`📋 Procesando línea ${index + 1}:`, parts)

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

            console.log(`🔍 Procesando comitente ${numeroComitente}, CUIT original: "${cuit}"`)

            // Si no hay CUIT, buscar por número de comitente
            if (!cuit || cuit.trim() === "" || cuit === "0") {
              console.log(`🔍 Buscando CUIT para comitente ${numeroComitente}...`)
              cuitLookupCount++

              const cuitEncontrado = await getCuitByComitente(numeroComitente)
              if (cuitEncontrado) {
                cuit = cuitEncontrado
                cuitFoundCount++
                console.log(`✅ CUIT encontrado: ${cuit}`)
              } else {
                console.warn(`❌ No se encontró CUIT para comitente ${numeroComitente}`)
                cuit = "00000000000" // CUIT por defecto
              }
            } else {
              console.log(`✅ CUIT ya informado: ${cuit}`)
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

      console.log(`📊 Resumen del procesamiento:`)
      console.log(`- E-checks procesados: ${newEchecks.length}`)
      console.log(`- Búsquedas de CUIT realizadas: ${cuitLookupCount}`)
      console.log(`- CUITs encontrados: ${cuitFoundCount}`)

      setEcheckEntries((prev) => [...prev, ...newEchecks])
      setBulkEcheckText("")
      setBulkEcheckFormat("")
      setShowBulkEcheckDialog(false)

      toast({
        title: "E-checks procesados",
        description: `Se agregaron ${newEchecks.length} e-checks. Búsquedas: ${cuitLookupCount}, Encontrados: ${cuitFoundCount}`,
      })
    } catch (error) {
      console.error("❌ Error al procesar e-checks:", error)
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
