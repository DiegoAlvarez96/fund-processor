"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, Building2, TrendingUp, Calculator, ArrowRightLeft } from "lucide-react"

// Importar componentes
import FundProcessor from "@/components/sections/FundProcessor"
import BankFiles from "@/components/sections/BankFiles"
import TitulosProcessor from "@/components/sections/TitulosProcessor"
import Dashboard from "@/components/sections/Dashboard"
import ConciliacionTransferencias from "@/components/sections/ConciliacionTransferencias"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sistema de Procesamiento Financiero</h1>
          <p className="text-gray-600 text-lg">
            Plataforma integral para el procesamiento de fondos, archivos bancarios y títulos
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1">
            <TabsTrigger
              value="dashboard"
              className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </TabsTrigger>

            <TabsTrigger value="fondos" className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white">
              <Calculator className="w-5 h-5" />
              <span className="text-sm font-medium">Fondos FCI</span>
            </TabsTrigger>

            <TabsTrigger
              value="archivos-bancarios"
              className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white"
            >
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-medium">Archivos Bancarios</span>
            </TabsTrigger>

            <TabsTrigger value="titulos" className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white">
              <FileSpreadsheet className="w-5 h-5" />
              <span className="text-sm font-medium">Títulos</span>
            </TabsTrigger>

            <TabsTrigger
              value="conciliacion"
              className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white"
            >
              <ArrowRightLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Conciliación</span>
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
                    <Calculator className="w-6 h-6" />
                    Procesador de Fondos FCI
                  </CardTitle>
                  <CardDescription>
                    Procese transacciones de fondos comunes de inversión y genere archivos para diferentes bancos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FundProcessor />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Archivos Bancarios Tab */}
          <TabsContent value="archivos-bancarios" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    Procesador de Archivos Bancarios
                  </CardTitle>
                  <CardDescription>Procese y genere archivos para diferentes entidades bancarias</CardDescription>
                </CardHeader>
                <CardContent>
                  <BankFiles />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Títulos Tab */}
          <TabsContent value="titulos" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6" />
                    Procesador de Títulos
                  </CardTitle>
                  <CardDescription>Procese archivos Excel de títulos y genere reportes detallados</CardDescription>
                </CardHeader>
                <CardContent>
                  <TitulosProcessor />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Conciliación Tab */}
          <TabsContent value="conciliacion" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="w-6 h-6" />
                    Conciliación de Transferencias
                  </CardTitle>
                  <CardDescription>
                    Sistema de conciliación entre solicitudes, recibos y movimientos bancarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConciliacionTransferencias />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
