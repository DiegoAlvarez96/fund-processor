"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Plus, Send, RotateCcw, Trash2, X, FileText, Lock, Eye, EyeOff } from "lucide-react"
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
  "1": "PY FCI A",
  "2": "PY FCI B",
  "3": "PY FCI C",
  "4": "AAA FCI A",
  "5": "AAA FCI B",
  "6": "DINA FCI A",
  "7": "DINA FCI B",
  "8": "DINA FCI C",
  "9": "AP FCI A",
  "10": "AP FCI B",
  "17": "RP FCI A",
  "18": "RP FCI B",
  "19": "BAL4 FCI A",
  "20": "BAL4 FCI B",
  "50": "RT FCI A",
  "51": "RT FCI B",
  "52": "RT FCI C",
}

const USERS = ["adcap", "adcap_99", "adcap_1000"]

export default function FundProcessor() {
  // Estado para autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [secretKey, setSecretKey] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState("")

  // Estados existentes
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

  // Verificar autenticación al cargar
  useEffect(() => {
    const savedAuth = localStorage.getItem("fund-processor-auth")
    if (savedAuth === "authenticated") {
      setIsAuthenticated(true)
    }
  }, [])

  // Función para validar clave secreta
  const handleAuthentication = async () => {
    if (!secretKey.trim()) {
      setAuthError("Por favor ingresa la clave secreta")
      return
    }

    try {
      const response = await fetch("/api/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey }),
      })

      const result = await response.json()

      if (result.success) {
        setIsAuthenticated(true)
        setAuthError("")
        localStorage.setItem("fund-processor-auth", "authenticated")
        toast({
          title: "Acceso autorizado",
          description: "Bienvenido al procesador de fondos",
        })
      } else {
        setAuthError("Clave secreta incorrecta")
        setSecretKey("")
      }
    } catch (error) {
      setAuthError("Error de conexión")
    }
  }

  // Función para cerrar sesión
  const handleLogout = () => {
    setIsAuthenticated(false)
    setSecretKey("")
    setTransactions([])
    localStorage.removeItem("fund-processor-auth")
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    })
  }

  // Pantalla de autenticación
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Acceso Restringido</CardTitle>
            <p className="text-gray-600">Ingresá tu clave secreta para continuar</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret">Clave Secreta</Label>
              <div className="relative">
                <Input
                  id="secret"
                  type={showPassword ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => {
                    setSecretKey(e.target.value)
                    setAuthError("")
                  }}
                  onKeyPress={(e) => e.key === "Enter" && handleAuthentication()}
                  placeholder="Ingresa la clave secreta"
                  className={authError ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {authError && <p className="text-sm text-red-600">{authError}</p>}
            </div>

            <Button onClick={handleAuthentication} className="w-full bg-blue-600 hover:bg-blue-700">
              <Lock className="w-4 h-4 mr-2" />
              Ingresar
            </Button>

            <div className="text-center text-sm text-gray-500">
              <p>Sistema de ADCAP Operaciones</p>
              <p className="text-xs mt-1">Acceso autorizado únicamente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Resto de las funciones existentes...
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const lines = content.split("\n").filter((line) => line.trim())

      const newTransactions: Transaction[] = lines
        .map((line, index) => {
          const parts = line.split(";")
          if (parts.length >= 5) {
            const [cuotapartista, tipo, fci, importe, cantidad, fechaConcertacion = "", fechaLiquidacion = ""] = parts
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

  // Interfaz principal (autenticado)
  return (
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle className="text-2xl font-bold text-center flex-1">Procesador de Fondos de Inversión</CardTitle>
        <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:text-red-800">
          <X className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </CardHeader>
    <div className="container mx-auto p-6 space-y-6">
      <Card>
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
