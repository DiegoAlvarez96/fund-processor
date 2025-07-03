"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Eye, EyeOff } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onLogin: (success: boolean) => void
}

export default function LoginModal({ isOpen, onLogin }: LoginModalProps) {
  const [secretKey, setSecretKey] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/authenticate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secretKey }),
      })

      const data = await response.json()

      if (data.success) {
        onLogin(true)
        setSecretKey("")
      } else {
        setError(data.error || "Error de autenticación")
        onLogin(false)
      }
    } catch (error) {
      console.error("Error en autenticación:", error)
      setError("Error de conexión")
      onLogin(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Acceso al Sistema
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secretKey">Clave de Acceso</Label>
            <div className="relative">
              <Input
                id="secretKey"
                type={showPassword ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Ingrese la clave secreta"
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verificando..." : "Ingresar"}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-500">
          <p>Sistema de Procesamiento Financiero</p>
          <p className="text-xs">ADCAP OPERACIONES</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
