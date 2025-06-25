"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Plus, Send, RotateCcw, Trash2, X, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Transaction {
  id: string
  cuotapartista: string
  tipo: "SUSC" | "RESC"
  fci: string
  importe: string
  cantidad: string
  fechaConcertacion?: string
  fechaLiquidacion?: string
  resultado?: string
  status?: "pending" | "success" | "error"
}

const FCI_DICT: Record<string, string> = {
    "1":"PY FCI A",
    "2":"PY FCI B",
    "3":"PY FCI C",
    "4":"AAA FCI A",
    "5":"AAA FCI B",
    "6":"DINA FCI A",
    "7":"DINA FCI B",
    "8":"DINA FCI C",
    "9":"AP FCI A",
    "10":"AP FCI B",
    "11":"AP FCI C",
    "12":"AP FCI H",
    "13":"AP FCI I",
    "17":"RP FCI A",
    "18":"RP FCI B",
    "19":"BAL4 FCI A",
    "20":"BAL4 FCI B",
    "21":"BAL4 FCI C",
    "22":"BAL5 FCI A",
    "23":"BAL5 FCI B",
    "24":"BAL5 FCI C",
    "25":"BAL6 FCI A",
    "26":"BAL6 FCI B",
    "27":"BAL6 FCI C",
    "28":"MUL FCI A",
    "28":"BAL7 FCI A",
    "29":"MUL FCI B",
    "29":"BAL7 FCI B",
    "30":"MUL FCI C",
    "30":"BAL7 FCI C",
    "31":"BAL8 FCI A",
    "32":"BAL8 FCI B",
    "34":"BAL10 FCI A",
    "35":"BAL10 FCI B",
    "36":"BAL10 FCI C",
    "37":"WISE FCI A",
    "38":"WISE FCI B",
    "39":"WISE FCI C",
    "40":"BAL12 FCI A",
    "41":"BAL12 FCI B",
    "42":"BAL12 FCI C",
    "43":"BAL2 FCI A",
    "44":"BAL2 FCI B",
    "45":"BAL2 FCI C",
    "46":"INFRA FCI A",
    "47":"INFRA FCI B",
    "48":"INFRA FCI C",
    "49":"INFRA FCI G",
    "50":"RT FCI A",
    "51":"RT FCI B",
    "52":"RT FCI C",
    "53":"PP FCI A",
    "54":"PP FCI B",
    "55":"PP FCI C",
    "56":"GL FCI D",
    "57":"GL FCI E",
    "58":"GL FCI F",
    "59":"RF FCI A",
    "60":"RF FCI B",
    "61":"RF FCI C",
    "62":"SYC FCI A",
    "63":"SYC FCI B",
    "64":"SYC FCI C",
    "65":"ASG FCI A",
    "66":"ASG FCI B",
    "67":"ASG FCI C",
    "68":"AWCG FCI A",
    "69":"AWCG FCI B",
    "70":"AWCG FCI C",
    "71":"AWCH FCI A",
    "72":"AWCH FCI B",
    "73":"AWCH FCI C",
    "74":"BAL16 FCI A",
    "75":"BAL16 FCI B",
    "76":"BAL16 FCI C",
    "77":"MUA FCI A",
    "78":"MUA FCI B",
    "79":"MUA FCI C",
    "80":"AD FCI D",
    "81":"AD FCI C",
    "82":"AD FCI E",
    "83":"IOLDP FCI D",
    "83":"IOLDP FCI D",
    "84":"AP FCI H1",
    "85":"BAL17 FCI A",
    "86":"BAL17 FCI B",
    "87":"BAL7 FCI B",
    "88":"BAL20 FCI A",
    "89":"BAL20 FCI B",
    "90":"BAL20 FCI C",
    "91":"BAL9 FCI A",
    "92":"BAL9 FCI B",
    "93":"BAL9 FCI C",
    "95":"RF FCI CERA",
    "96":"PY FCI CERA",
    "97":"RT FCI CERA",
    "98":"AAA FCI CERA",
    "99":"PP FCI CERA",
    "100":"GL FCI CERA",
    "101":"AP FCI CERA",
    "102":"BAL2 FCI CERA",
    "103":"DINA FCI CERA",
    "104":"BAL16 FCI CERA",
    "105":"BAL9 FCI CERA",
    "106":"MUA FCI CERA",
    "107":"BAL12 FCI CERA",
    "108":"BAL6 FCI CERA",
    "109":"BAL20 FCI CERA",
    "110":"BAL10 FCI CERA",
    "111":"AWCG FCI CERA",
    "112":"MUL FCI CERA",
    "113":"BAL15 FCI CERA",
    "114":"AD FCI CERA",
    "115":"BAL13 FCI A",
    "116":"BAL13 FCI B",
    "117":"BAL13 FCI C",
    "118":"IOLDP FCI E",
    "119":"IOLDP FCI F",
    "120":"IOLDP FCI CERA",
    "121":"ALYP FCI A",
    "122":"ALYP FCI C",
    "123":"ALYP FCI B",
    "138":"BAL15 FCI A",
    "139":"BAL15 FCI B"
}

const USERS = ["adcap", "adcap_99", "adcap_1000"]

export default function FundProcessor() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Formulario para nueva transacción
  const [newTransaction, setNewTransaction] = useState({
    cuotapartista: "",
    tipo: "" as "SUSC" | "RESC",
    fci: "",
    importe: "",
    cantidad: "",
    fechaConcertacion: "",
    fechaLiquidacion: "",
  })

  // Estado para eliminar solicitud
  const [deleteForm, setDeleteForm] = useState({
    user: "",
    requestId: "",
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const lines = content.split(/\r?\n|\r/).filter((line) => line.trim())

      const newTransactions: Transaction[] = lines
      .map((line, index) => {
        const parts = line.split(";").map(p => p.trim())
        if (parts.length >= 5) {
          const [cuotapartista, tipo, fci, importe, cantidad = "0", fechaConcertacion = "", fechaLiquidacion = ""] = parts
          return {
            id: `${Date.now()}-${index}`,
            cuotapartista,
            tipo: tipo as "SUSC" | "RESC",
            fci,
            importe,
            cantidad,
            fechaConcertacion,
            fechaLiquidacion,
            status: "pending",
          }
        }
        return null
      })
      .filter(Boolean) as Transaction[]


      setTransactions(newTransactions)
      toast({
        title: "Archivo cargado",
        description: `Se cargaron ${newTransactions.length} transacciones`,
      })
    }
    reader.readAsText(file)
  }

  const processTransactions = async (transactionIds?: string[]) => {
    setIsProcessing(true)
    const toProcess = transactionIds ? transactions.filter((t) => transactionIds.includes(t.id)) : transactions

    let successCount = 0
    let failCount = 0

    for (const transaction of toProcess) {
      try {
        const response = await fetch("/api/process-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transaction),
        })

        const result = await response.json()

        setTransactions((prev) =>
          prev.map((t) =>
            t.id === transaction.id
              ? {
                  ...t,
                  resultado: result.success ? result.description : result.error,
                  status: result.success ? "success" : "error",
                }
              : t,
          ),
        )

        if (result.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === transaction.id ? { ...t, resultado: "Error de conexión", status: "error" } : t)),
        )
        failCount++
      }
    }

    setIsProcessing(false)
    toast({
      title: "Procesamiento completado",
      description: `✅ Exitosas: ${successCount} | ❌ Fallidas: ${failCount}`,
    })
  }

  const retryFailedTransactions = () => {
    const failedIds = transactions.filter((t) => t.status === "error").map((t) => t.id)

    if (failedIds.length === 0) {
      toast({
        title: "Sin transacciones fallidas",
        description: "No hay transacciones fallidas para reintentar",
      })
      return
    }

    processTransactions(failedIds)
  }

  const addTransaction = () => {
    if (!newTransaction.cuotapartista || !newTransaction.tipo || !newTransaction.fci) {
      toast({
        title: "Campos requeridos",
        description: "Complete los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    const transaction: Transaction = {
      id: `${Date.now()}`,
      ...newTransaction,
      status: "pending",
    }

    setTransactions((prev) => [...prev, transaction])
    setNewTransaction({
      cuotapartista: "",
      tipo: "" as "SUSC" | "RESC",
      fci: "",
      importe: "",
      cantidad: "",
      fechaConcertacion: "",
      fechaLiquidacion: "",
    })
    setShowAddDialog(false)

    toast({
      title: "Transacción agregada",
      description: "La transacción se agregó correctamente",
    })
  }

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    toast({
      title: "Transacción eliminada",
      description: "La transacción se eliminó de la lista",
    })
  }

  const clearTable = () => {
    setTransactions([])
    toast({
      title: "Tabla limpiada",
      description: "Se eliminaron todas las transacciones",
    })
  }

  const handleDeleteRequest = async () => {
    if (!deleteForm.user || !deleteForm.requestId) {
      toast({
        title: "Campos requeridos",
        description: "Complete usuario e ID de solicitud",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/delete-request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteForm),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Solicitud eliminada",
          description: `Solicitud ${deleteForm.requestId} eliminada correctamente`,
        })
        setShowDeleteDialog(false)
        setDeleteForm({ user: "", requestId: "" })
      } else {
        toast({
          title: "Error al eliminar",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    }
  }

  const getFciName = (fciNumber: string) => {
    return FCI_DICT[fciNumber] || fciNumber
  }

  const formatCurrency = (amount: string) => {
    const num = Number.parseFloat(amount.replace(/[^\d.]/g, ""))
    return isNaN(num) ? amount : `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Procesador de Fondos de Inversión</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Botones superiores */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Solicitud
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Añadir Nueva Transacción</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Cuotapartista</Label>
                    <Select
                      value={newTransaction.cuotapartista}
                      onValueChange={(value) => setNewTransaction((prev) => ({ ...prev, cuotapartista: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {USERS.map((user) => (
                          <SelectItem key={user} value={user}>
                            {user}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={newTransaction.tipo}
                      onValueChange={(value: "SUSC" | "RESC") =>
                        setNewTransaction((prev) => ({ ...prev, tipo: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUSC">SUSC</SelectItem>
                        <SelectItem value="RESC">RESC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>N° FCI</Label>
                    <Input
                      value={newTransaction.fci}
                      onChange={(e) => setNewTransaction((prev) => ({ ...prev, fci: e.target.value }))}
                      placeholder="Número de fondo"
                    />
                  </div>

                  <div>
                    <Label>Importe</Label>
                    <Input
                      value={newTransaction.importe}
                      onChange={(e) => setNewTransaction((prev) => ({ ...prev, importe: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  {newTransaction.tipo === "RESC" && (
                    <div>
                      <Label>Cantidad</Label>
                      <Input
                        value={newTransaction.cantidad}
                        onChange={(e) => setNewTransaction((prev) => ({ ...prev, cantidad: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Fecha Concertación</Label>
                    <Input
                      type="date"
                      value={newTransaction.fechaConcertacion}
                      onChange={(e) => setNewTransaction((prev) => ({ ...prev, fechaConcertacion: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Fecha Liquidación</Label>
                    <Input
                      type="date"
                      value={newTransaction.fechaLiquidacion}
                      onChange={(e) => setNewTransaction((prev) => ({ ...prev, fechaLiquidacion: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={addTransaction} className="flex-1 bg-green-600 hover:bg-green-700">
                      Agregar
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              <Upload className="w-4 h-4 mr-2" />
              Cargar TXT
            </Button>
            <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />

            <div className="ml-auto flex gap-2">
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <X className="w-4 h-4 mr-2" />
                    Eliminar Solicitud VF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Eliminar Solicitud por ID</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Usuario / CP</Label>
                      <Select
                        value={deleteForm.user}
                        onValueChange={(value) => setDeleteForm((prev) => ({ ...prev, user: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          {USERS.map((user) => (
                            <SelectItem key={user} value={user}>
                              {user}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>ID de la solicitud</Label>
                      <Input
                        value={deleteForm.requestId}
                        onChange={(e) => setDeleteForm((prev) => ({ ...prev, requestId: e.target.value }))}
                        placeholder="ID numérico"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleDeleteRequest} variant="destructive" className="flex-1">
                        Eliminar
                      </Button>
                      <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tabla de transacciones */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-center">Cuotapartista</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">N° FCI</TableHead>
                  <TableHead className="text-center">Importe</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-center">F. Concertación</TableHead>
                  <TableHead className="text-center">F. Liquidación</TableHead>
                  <TableHead className="text-center">Resultado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      No hay transacciones cargadas
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className={
                        transaction.status === "success"
                          ? "bg-green-50"
                          : transaction.status === "error"
                            ? "bg-red-50"
                            : ""
                      }
                    >
                      <TableCell className="text-center">{transaction.cuotapartista}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={transaction.tipo === "SUSC" ? "default" : "secondary"}>
                          {transaction.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {transaction.fci} - {getFciName(transaction.fci)}
                      </TableCell>
                      <TableCell className="text-center">{formatCurrency(transaction.importe)}</TableCell>
                      <TableCell className="text-center">{transaction.cantidad}</TableCell>
                      <TableCell className="text-center">{transaction.fechaConcertacion}</TableCell>
                      <TableCell className="text-center">{transaction.fechaLiquidacion}</TableCell>
                      <TableCell className="text-center">
                        {transaction.resultado && (
                          <Badge
                            variant={transaction.status === "success" ? "default" : "destructive"}
                            className="max-w-xs truncate"
                          >
                            {transaction.resultado}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Botones inferiores */}
          <div className="flex justify-between items-center mt-6">
            <Button variant="destructive" onClick={clearTable} disabled={transactions.length === 0}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Tabla
            </Button>

            <div className="flex gap-3">
              <Button
                onClick={() => processTransactions()}
                disabled={isProcessing || transactions.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isProcessing ? "Procesando..." : "Enviar"}
              </Button>

              <Button
                variant="outline"
                onClick={retryFailedTransactions}
                disabled={isProcessing || !transactions.some((t) => t.status === "error")}
                className="bg-yellow-50 text-yellow-700 border-yellow-200"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reintentar Fallidas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
