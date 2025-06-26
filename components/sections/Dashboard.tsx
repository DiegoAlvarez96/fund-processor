"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Building2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const handleNavigation = (sectionId: string) => {
    const event = new CustomEvent("navigate-to-section", { detail: sectionId })
    window.dispatchEvent(event)
  }

  return (
    <div className="space-y-8">
      {/* Header de bienvenida */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Bienvenido a <span className="text-blue-600">ADCAP OPERACIONES</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Sistema integral de gestión financiera para el procesamiento de fondos de inversión y archivos bancarios
        </p>
      </div>

      {/* Accesos directos a módulos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Módulo de Gestión de Fondos */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Gestión de Fondos</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 text-lg">
              Procesa suscripciones y rescates de fondos de inversión de manera eficiente
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>• Carga masiva de transacciones</li>
              <li>• Procesamiento automático</li>
              <li>• Gestión de errores y reintentos</li>
              <li>• Eliminación de solicitudes</li>
            </ul>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
              onClick={() => handleNavigation("procesador-fondos")}
            >
              Acceder al Procesador de Fondos
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Módulo de Archivos Bancarios */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-300">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Archivos Bancarios</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 text-lg">Procesa y gestiona archivos de diferentes entidades bancarias</p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>• Soporte múltiples bancos</li>
              <li>• Diferentes tipos de archivo</li>
              <li>• Procesamiento automático</li>
              <li>• Reportes y estadísticas</li>
            </ul>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              onClick={() => handleNavigation("archivos-bancos")}
            >
              Acceder a Archivos Bancarios
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <div className="text-center py-8">
        <Card className="max-w-2xl mx-auto bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sistema Seguro y Confiable</h3>
            <p className="text-gray-600">
              Todas las operaciones están protegidas con autenticación segura y timeout de sesión automático. El sistema
              mantiene un registro completo de todas las actividades realizadas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
