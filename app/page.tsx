"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Dashboard from "@/components/sections/Dashboard"
import BankFileProcessor from "@/components/sections/bank-file-processor"
import FundProcessor from "@/components/sections/FundProcessor"
import TitulosProcessor from "@/components/sections/TitulosProcessor"
import ConciliacionTransferencias from "@/components/sections/conciliacion-transferencias"
import LoginModal from "@/components/sections/LoginModal"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(30 * 60) // 30 minutos en segundos
  const { toast } = useToast()

  // Verificar autenticación al cargar
  useEffect(() => {
    const authStatus = sessionStorage.getItem("isAuthenticated")
    const loginTime = sessionStorage.getItem("loginTime")

    if (authStatus === "true" && loginTime) {
      const elapsed = (Date.now() - Number.parseInt(loginTime)) / 1000
      const remaining = Math.max(0, 30 * 60 - elapsed)

      if (remaining > 0) {
        setIsAuthenticated(true)
        setSessionTimeLeft(Math.floor(remaining))
      } else {
        // Sesión expirada
        handleLogout()
      }
    } else {
      setShowLoginModal(true)
    }
  }, [])

  // Timer de sesión y detección de actividad
  useEffect(() => {
    if (!isAuthenticated) return

    let inactivityTimer: NodeJS.Timeout
    let countdownTimer: NodeJS.Timeout

    const resetTimer = () => {
      setSessionTimeLeft(30 * 60) // Reiniciar a 30 minutos
      sessionStorage.setItem("loginTime", Date.now().toString())
    }

    const handleActivity = () => {
      resetTimer()
    }

    // Countdown timer
    countdownTimer = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          handleLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Activity listeners
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      clearInterval(countdownTimer)
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [isAuthenticated])

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAuthenticated(true)
      setShowLoginModal(false)
      setSessionTimeLeft(30 * 60)
      sessionStorage.setItem("isAuthenticated", "true")
      sessionStorage.setItem("loginTime", Date.now().toString())
      toast({
        title: "Acceso autorizado",
        description: "Bienvenido al sistema",
      })
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setShowLoginModal(true)
    sessionStorage.removeItem("isAuthenticated")
    sessionStorage.removeItem("loginTime")
    toast({
      title: "Sesión cerrada",
      description: "Su sesión ha sido cerrada por inactividad",
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (!isAuthenticated) {
    return <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con botón de logout discreto */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-800 shadow-sm"
          >
            <LogOut className="w-3 h-3 mr-1" />
            Cerrar Sesión
          </Button>
          <div className="flex items-center gap-1 text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded border">
            <Clock className="w-3 h-3" />
            {formatTime(sessionTimeLeft)}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sistema de Gestión de Operaciones</h1>
          <p className="text-gray-600">
            Sistema integral de gestión financiera para el procesamiento de fondos de inversión y archivos bancarios
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="bank-files">Archivos Bancarios</TabsTrigger>
            <TabsTrigger value="funds">Fondos FCI</TabsTrigger>
            <TabsTrigger value="titulos">Títulos</TabsTrigger>
            <TabsTrigger value="conciliacion">Conciliación</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="bank-files">
            <Card>
              <CardHeader>
                <CardTitle>Procesamiento de Archivos Bancarios</CardTitle>
              </CardHeader>
              <CardContent>
                <BankFileProcessor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funds">
            <Card>
              <CardHeader>
                <CardTitle>Procesamiento de Fondos FCI</CardTitle>
              </CardHeader>
              <CardContent>
                <FundProcessor />
              </CardContent>
            </Card>
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
