"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Menu,
  Lock,
  Eye,
  EyeOff,
  Clock,
  TrendingUp,
  Building2,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Importar componentes de las diferentes secciones
import FundProcessor from "@/components/sections/FundProcessor"
import BankFiles from "@/components/sections/bank-file-processor"
import Dashboard from "@/components/sections/Dashboard"
// Importar el nuevo componente
import TitulosProcessor from "@/components/sections/TitulosProcessor"

// Configuración de timeout (en minutos)
const SESSION_TIMEOUT_MINUTES = 30
const WARNING_MINUTES = 5

// Definir estructura del menú
interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  component?: React.ComponentType
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <Home className="w-4 h-4" />,
    component: Dashboard,
  },
  {
    id: "fondos",
    label: "Gestión de Fondos",
    icon: <TrendingUp className="w-4 h-4" />,
    children: [
      {
        id: "procesador-fondos",
        label: "Procesador de Fondos",
        icon: <FileText className="w-4 h-4" />,
        component: FundProcessor,
      },
      {
        id: "reportes-fondos",
        label: "Reportes de Fondos",
        icon: <FileText className="w-4 h-4" />,
        // component: ReportesFondos, // Por implementar
      },
    ],
  },
  {
    id: "titulos",
    label: "Gestión de Títulos",
    icon: <TrendingUp className="w-4 h-4" />,
    children: [
      {
        id: "procesador-titulos",
        label: "Procesador de Títulos",
        icon: <FileText className="w-4 h-4" />,
        component: TitulosProcessor,
      },
    ],
  },
  {
    id: "bancos",
    label: "Archivos Bancarios",
    icon: <Building2 className="w-4 h-4" />,
    children: [
      {
        id: "archivos-bancos",
        label: "Procesador de Archivos",
        icon: <FileText className="w-4 h-4" />,
        component: BankFiles,
      },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: <Settings className="w-4 h-4" />,
    children: [
      {
        id: "usuarios",
        label: "Gestión de Usuarios",
        icon: <FileText className="w-4 h-4" />,
        // component: GestionUsuarios, // Por implementar
      },
      {
        id: "parametros",
        label: "Parámetros del Sistema",
        icon: <FileText className="w-4 h-4" />,
        // component: Parametros, // Por implementar
      },
    ],
  },
]

export default function MainApp() {
  // Estado para autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [secretKey, setSecretKey] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState("")

  // Estados para timeout de sesión
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_TIMEOUT_MINUTES * 60)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Estados para el menú lateral
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [expandedItems, setExpandedItems] = useState<string[]>(["fondos", "titulos"])

  const { toast } = useToast()

  // Función para cerrar sesión por timeout
  const handleSessionTimeout = useCallback(() => {
    setIsAuthenticated(false)
    setSecretKey("")
    setShowTimeoutWarning(false)
    localStorage.removeItem("fund-processor-auth")
    localStorage.removeItem("fund-processor-session-start")

    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

    toast({
      title: "Sesión expirada",
      description: "Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.",
      variant: "destructive",
    })
  }, [toast])

  // Función para extender sesión
  const extendSession = useCallback(() => {
    setSessionTimeLeft(SESSION_TIMEOUT_MINUTES * 60)
    setShowTimeoutWarning(false)
    localStorage.setItem("fund-processor-session-start", Date.now().toString())

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

    warningTimerRef.current = setTimeout(
      () => {
        setShowTimeoutWarning(true)
      },
      (SESSION_TIMEOUT_MINUTES - WARNING_MINUTES) * 60 * 1000,
    )
  }, [])

  // Función para resetear actividad del usuario
  const resetUserActivity = useCallback(() => {
    if (isAuthenticated) {
      extendSession()
    }
  }, [isAuthenticated, extendSession])

  // Verificar autenticación y configurar timers al cargar
  useEffect(() => {
    const savedAuth = localStorage.getItem("fund-processor-auth")
    const sessionStart = localStorage.getItem("fund-processor-session-start")

    if (savedAuth === "authenticated" && sessionStart) {
      const elapsed = (Date.now() - Number.parseInt(sessionStart)) / 1000 / 60

      if (elapsed < SESSION_TIMEOUT_MINUTES) {
        setIsAuthenticated(true)
        const remainingTime = (SESSION_TIMEOUT_MINUTES - elapsed) * 60
        setSessionTimeLeft(Math.floor(remainingTime))

        if (remainingTime > WARNING_MINUTES * 60) {
          warningTimerRef.current = setTimeout(
            () => {
              setShowTimeoutWarning(true)
            },
            (remainingTime - WARNING_MINUTES * 60) * 1000,
          )
        } else {
          setShowTimeoutWarning(true)
        }
      } else {
        handleSessionTimeout()
      }
    }
  }, [handleSessionTimeout])

  // Timer de cuenta regresiva
  useEffect(() => {
    if (isAuthenticated) {
      sessionTimerRef.current = setInterval(() => {
        setSessionTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
    }
  }, [isAuthenticated, handleSessionTimeout])

  // Detectar actividad del usuario
  useEffect(() => {
    if (isAuthenticated) {
      const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

      const handleActivity = () => {
        resetUserActivity()
      }

      events.forEach((event) => {
        document.addEventListener(event, handleActivity, true)
      })

      return () => {
        events.forEach((event) => {
          document.removeEventListener(event, handleActivity, true)
        })
      }
    }
  }, [isAuthenticated, resetUserActivity])

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
        setSessionTimeLeft(SESSION_TIMEOUT_MINUTES * 60)
        localStorage.setItem("fund-processor-auth", "authenticated")
        localStorage.setItem("fund-processor-session-start", Date.now().toString())

        warningTimerRef.current = setTimeout(
          () => {
            setShowTimeoutWarning(true)
          },
          (SESSION_TIMEOUT_MINUTES - WARNING_MINUTES) * 60 * 1000,
        )

        toast({
          title: "Acceso autorizado",
          description: `Bienvenido al sistema. Sesión válida por ${SESSION_TIMEOUT_MINUTES} minutos.`,
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
    setShowTimeoutWarning(false)
    localStorage.removeItem("fund-processor-auth")
    localStorage.removeItem("fund-processor-session-start")

    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    })
  }

  // Función para alternar expansión de elementos del menú
  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  // Función para renderizar elementos del menú
  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const isActive = activeSection === item.id

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id)
            } else {
              setActiveSection(item.id)
            }
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors",
            level > 0 && "ml-4",
            isActive ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100",
          )}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">{item.children!.map((child) => renderMenuItem(child, level + 1))}</div>
        )}
      </div>
    )
  }

  // Formatear tiempo restante
  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Obtener componente activo
  const getActiveComponent = () => {
    const findComponent = (items: MenuItem[]): React.ComponentType | null => {
      for (const item of items) {
        if (item.id === activeSection && item.component) {
          return item.component
        }
        if (item.children) {
          const found = findComponent(item.children)
          if (found) return found
        }
      }
      return null
    }

    const Component = findComponent(menuItems)
    return Component ? <Component /> : <Dashboard />
  }

  // ───────────────────────────────────────────
  // Catch navigation requests from child views
  // ───────────────────────────────────────────
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const custom = e as CustomEvent<string>
      if (custom.detail) setActiveSection(custom.detail)
    }
    window.addEventListener("navigate-to-section", handleNavigate)
    return () => window.removeEventListener("navigate-to-section", handleNavigate)
  }, [])

  // Pantalla de autenticación
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">ADCAP OPERACIONES</CardTitle>
            <p className="text-gray-600">Sistema de Gestión Financiera</p>
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
              Ingresar al Sistema
            </Button>

            <div className="text-center text-sm text-gray-500">
              <p>Sistema de gestión</p>
              <p className="text-xs mt-1">Acceso autorizado únicamente</p>
              <p className="text-xs mt-1 text-blue-600">Sesión válida por {SESSION_TIMEOUT_MINUTES} minutos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Interfaz principal (autenticado)
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        {/* Header del sidebar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h2 className="text-lg font-semibold text-gray-800">ADCAP OPERACIONES</h2>}
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Menú de navegación */}
        {sidebarOpen && (
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">{menuItems.map((item) => renderMenuItem(item))}</nav>
        )}

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Sesión: {formatTimeLeft(sessionTimeLeft)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full text-red-600 hover:text-red-800 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full p-2 text-red-600 hover:text-red-800"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Advertencia de timeout */}
        {showTimeoutWarning && (
          <div className="bg-orange-50 border-b border-orange-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Tu sesión expirará en {formatTimeLeft(sessionTimeLeft)}
                  </p>
                  <p className="text-xs text-orange-600">Haz clic en "Extender Sesión" para continuar trabajando</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={extendSession} className="bg-orange-600 hover:bg-orange-700">
                  Extender Sesión
                </Button>
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto p-6">{getActiveComponent()}</main>
      </div>
    </div>
  )
}
