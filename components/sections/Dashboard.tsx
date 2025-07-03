"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Building2, ArrowRight, BarChart3 } from "lucide-react"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
              <li>• Operativo para cc 1000, 10119, 9910119</li>
              <li>• Carga masiva de transacciones</li>
              <li>• Eliminación de solicitudes en VF</li>
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
              <li>• Generador de archivos masivos para transferencias</li>
              <li>• GENERACION TRF MULTIPLE PARA FIRMA INFERIORES</li>
              <li>• BCO VALORES</li>
              <li>• BCO COMAFI</li>
              <li>• GENERACION DE TXT PARA ECHEQS MULTIBANCO</li>
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

        {/* Módulo de Conciliación TR VALO */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-300">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Conciliación TR VALO</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 text-lg">
              Sistema de conciliación entre solicitudes, recibos y movimientos bancarios
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>�� Conciliación automática de transferencias</li>
              <li>• Análisis de movimientos bancarios</li>
              <li>• Separación de mercados y transferencias</li>
              <li>• Exportación de resultados a Excel</li>
              <li>• Detección automática de headers</li>
            </ul>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6"
              onClick={() => handleNavigation("conciliacion-transferencias")}
            >
              Acceder a Conciliación TR VALO
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <div className="text-center py-8">
        <Card className="max-w-2xl mx-auto bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sistema en Desarrollo</h3>
            <p className="text-gray-600">
              En creación, chequear funcionalidades y reportar cualquier inconveniente al equipo de desarrollo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
