"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Building2, TrendingUp, ArrowRightLeft, BarChart3 } from "lucide-react"

// Importar componentes
import Dashboard from "@/components/sections/Dashboard"
import FundProcessor from "@/components/sections/FundProcessor"
import BankFileProcessor from "@/components/sections/bank-file-processor"
import TitulosProcessor from "@/components/sections/TitulosProcessor"
import ConciliacionTransferencias from "@/components/sections/conciliacion-transferencias"

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sistema de Procesamiento Financiero</h1>
          <p className="text-gray-600 text-lg">
            Plataforma integral para el procesamiento de archivos financieros y conciliación bancaria
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
    </div>
  )
}
