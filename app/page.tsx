"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LogOut, Clock, Shield, TrendingUp, Building2, FileText, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Dashboard from "@/components/sections/Dashboard"
import BankFiles from "@/components/sections/BankFiles"
import FundProcessor from "@/components/sections/FundProcessor"
import TitulosProcessor from "@/components/sections/TitulosProcessor"
import ConciliacionTransferencias from "@/components/sections/conciliacion-transferencias"
import LoginModal from "@/components/sections/LoginModal"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutos en segundos
  const [isActive, setIsActive] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const intervalRef = useRef<NodeJS.Timeout>()
  const { toast } = useToast()

  // Verificar autenticación al cargar
  useEffect(() => {
    const authData = sessionStorage.getItem("auth_session")
    if (authData) {
      try {
        const { timestamp } = JSON.parse(authData)
        const now = Date.now()
        const elapsed = (now - timestamp) / 1000 // segundos transcurridos
        const remaining = Math.max(0, 30 * 60 - elapsed)

        if (remaining > 0) {
          setIsAuthenticated(true)
          setTimeLeft(Math.floor(remaining))
          startInactivityTimer()
        } else {
          // Sesión expirada
          handleLogout()
        }
      } catch (error) {
        console.error("Error parsing auth data:", error)
        handleLogout()
      }
    } else {
      setShowLoginModal(true)
    }
  }, [])

  // Contador regresivo
  useEffect(() => {
    if (isAuthenticated && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleLogout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAuthenticated, timeLeft])

  // Manejar actividad del usuario
  const resetInactivityTimer = () => {
    if (!isAuthenticated) return

    setTimeLeft(30 * 60) // Resetear a 30 minutos
    setIsActive(true)

    // Actualizar timestamp en sessionStorage
    const authData = {
      authenticated: true,
      timestamp: Date.now(),
    }
    sessionStorage.setItem("auth_session", JSON.stringify(authData))

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    startInactivityTimer()
  }

  const startInactivityTimer = () => {
    timeoutRef.current = setTimeout(
      () => {
        setIsActive(false)
        handleLogout()
      },
      30 * 60 * 1000,
    ) // 30 minutos
  }

  // Eventos de actividad
  useEffect(() => {
    if (!isAuthenticated) return

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

    const resetTimer = () => resetInactivityTimer()

    events.forEach((event) => {
      document.addEventListener(event, resetTimer, true)
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer, true)
      })
    }
  }, [isAuthenticated])

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAuthenticated(true)
      setShowLoginModal(false)
      setTimeLeft(30 * 60)

      // Guardar en sessionStorage
      const authData = {
        authenticated: true,
        timestamp: Date.now(),
      }
      sessionStorage.setItem("auth_session", JSON.stringify(authData))

      startInactivityTimer()

      toast({
        title: "Acceso autorizado",
        description: "Bienvenido al sistema",
      })
    } else {
      toast({
        title: "Acceso denegado",
        description: "Credenciales incorrectas",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setShowLoginModal(true)
    setTimeLeft(30 * 60)

    // Limpiar sessionStorage
    sessionStorage.removeItem("auth_session")

    // Limpiar timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    toast({
      title: "Sesión cerrada",
      description: "Has sido desconectado del sistema",
    })
  }

  // Formatear tiempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!isAuthenticated) {
    return <LoginModal isOpen={showLoginModal} onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header con botón de logout */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Sistema de Gestión de Operaciones
              </h1>
              <p className="text-sm text-gray-600">
                Sistema integral de gestión financiera para el procesamiento de fondos de inversión y archivos bancarios
              </p>
            </div>

            {/* Botón de logout discreto en la esquina superior derecha */}
            <div className="flex flex-col items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:border-red-300 bg-transparent"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </Button>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="bank-files" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Archivos Bancarios
            </TabsTrigger>
            <TabsTrigger value="fund-processor" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Fondos FCI
            </TabsTrigger>
            <TabsTrigger value="titulos" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Títulos
            </TabsTrigger>
            <TabsTrigger value="conciliacion" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Conciliación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="bank-files">
            <BankFiles />
          </TabsContent>

          <TabsContent value="fund-processor">
            <FundProcessor />
          </TabsContent>

          <TabsContent value="titulos">
            <TitulosProcessor />
          </TabsContent>

          <TabsContent value="conciliacion">
            <ConciliacionTransferencias />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
