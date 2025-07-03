"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Building2, TrendingUp, ArrowRightLeft, BarChart3, LogOut } from "lucide-react"

// Importar componentes
import Dashboard from "@/components/sections/Dashboard"
import FundProcessor from "@/components/sections/FundProcessor"
import BankFileProcessor from "@/components/sections/bank-file-processor"
import TitulosProcessor from "@/components/sections/TitulosProcessor"
import ConciliacionTransferencias from "@/components/sections/conciliacion-transferencias"
import LoginModal from "@/components/sections/LoginModal"

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(30 * 60) // 30 minutos en segundos
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    setShowLoginModal(true)
    sessionStorage.removeItem("authenticated")
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    // Reset countdown
    setTimeRemaining(30 * 60)
    // 30 minutos en milisegundos
    inactivityTimerRef.current = setTimeout(logout, 30 * 60 * 1000)
  }, [logout])

  useEffect(() => {
    // Verificar si ya está autenticado en sessionStorage
    const authenticated = sessionStorage.getItem("authenticated")
    if (authenticated === "true") {
      setIsAuthenticated(true)
      setShowLoginModal(false)
      resetInactivityTimer() // Iniciar el temporizador al cargar si ya está autenticado
    }

    // Configurar listeners de actividad solo si está autenticado
    const setupActivityListeners = () => {
      window.addEventListener("mousemove", resetInactivityTimer)
      window.addEventListener("keydown", resetInactivityTimer)
      window.addEventListener("click", resetInactivityTimer)
    }

    const cleanupActivityListeners = () => {
      window.removeEventListener("mousemove", resetInactivityTimer)
      window.removeEventListener("keydown", resetInactivityTimer)
      window.removeEventListener("click", resetInactivityTimer)
    }

    if (isAuthenticated) {
      setupActivityListeners()
    } else {
      cleanupActivityListeners()
    }

    return () => {
      cleanupActivityListeners()
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [isAuthenticated, resetInactivityTimer])

  // Contador regresivo
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null

    if (isAuthenticated) {
      countdownInterval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            return 30 * 60 // Reset to 30 minutes
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  }, [isAuthenticated])

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAuthenticated(true)
      setShowLoginModal(false)
      sessionStorage.setItem("authenticated", "true")
      resetInactivityTimer() // Iniciar el temporizador después de un login exitoso
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? (
        <div className="container mx-auto p-6 relative">
          {/* Botón de logout discreto en esquina superior derecha */}
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white rounded-lg shadow-sm border p-2">
              <button
                onClick={logout}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Cerrar sesión
              </button>
              <div className="text-xs text-gray-500 mt-1 text-center">{formatTime(timeRemaining)}</div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 pt-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sistema de Gestión de Operaciones</h1>
            <p className="text-gray-600 text-lg">
              Sistema integral de gestión financiera para el procesamiento de fondos de inversión y archivos bancarios
            </p>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="fondos" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Fondos FCI
              </TabsTrigger>
              <TabsTrigger value="archivos-bancarios" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Archivos Bancarios
              </TabsTrigger>
              <TabsTrigger value="titulos" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Títulos
              </TabsTrigger>
              <TabsTrigger value="conciliacion" className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                Conciliación
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <Dashboard />
            </TabsContent>

            {/* Fondos FCI Tab */}
            <TabsContent value="fondos" className="space-y-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Procesador de Fondos FCI
                    </CardTitle>
                    <CardDescription>
                      Procese transacciones de fondos comunes de inversión y genere archivos para diferentes bancos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary">Excel/CSV</Badge>
                      <Badge variant="secondary">Múltiples Bancos</Badge>
                      <Badge variant="secondary">Validación Automática</Badge>
                      <Badge variant="secondary">Exportación</Badge>
                    </div>
                  </CardContent>
                </Card>
                <FundProcessor />
              </div>
            </TabsContent>

            {/* Archivos Bancarios Tab */}
            <TabsContent value="archivos-bancarios" className="space-y-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Procesador de Archivos Bancarios
                    </CardTitle>
                    <CardDescription>
                      Genere archivos bancarios para diferentes entidades financieras con validación automática
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary">Múltiples Bancos</Badge>
                      <Badge variant="secondary">Validación CUIT</Badge>
                      <Badge variant="secondary">Formatos Específicos</Badge>
                      <Badge variant="secondary">Descarga Directa</Badge>
                    </div>
                  </CardContent>
                </Card>
                <BankFileProcessor />
              </div>
            </TabsContent>

            {/* Títulos Tab */}
            <TabsContent value="titulos" className="space-y-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Procesador de Títulos
                    </CardTitle>
                    <CardDescription>
                      Procese archivos Excel de títulos valores con validación y generación de emails automáticos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary">Excel Processing</Badge>
                      <Badge variant="secondary">Email Generation</Badge>
                      <Badge variant="secondary">Data Validation</Badge>
                      <Badge variant="secondary">Bulk Operations</Badge>
                    </div>
                  </CardContent>
                </Card>
                <TitulosProcessor />
              </div>
            </TabsContent>

            {/* Conciliación Tab */}
            <TabsContent value="conciliacion" className="space-y-6">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5" />
                      Conciliación de Transferencias
                    </CardTitle>
                    <CardDescription>
                      Sistema de conciliación automática entre solicitudes de pago, recibos y movimientos bancarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary">Conciliación Automática</Badge>
                      <Badge variant="secondary">Múltiples Archivos</Badge>
                      <Badge variant="secondary">Validación Cruzada</Badge>
                      <Badge variant="secondary">Reportes Detallados</Badge>
                    </div>
                  </CardContent>
                </Card>
                <ConciliacionTransferencias />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sistema de Gestión de Operaciones</h1>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      )}
      {/* Modal de Login */}
      <LoginModal isOpen={showLoginModal && !isAuthenticated} onLogin={handleLogin} />
    </div>
  )
}
