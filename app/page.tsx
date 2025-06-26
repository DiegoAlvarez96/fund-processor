
"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, Plus, Send, RotateCcw, Trash2, X, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const PROCESADOR_SECRET = process.env.NEXT_PUBLIC_PROCESADOR_SECRET ?? ""

export default function App() {
  const [activeView, setActiveView] = useState("procesador")

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 p-4 space-y-4 border-r">
        <h2 className="text-lg font-bold mb-4">Menú</h2>
        <Button variant={activeView === "procesador" ? "default" : "outline"} className="w-full" onClick={() => setActiveView("procesador")}>Procesador de Fondos</Button>
        <Button variant={activeView === "bancos" ? "default" : "outline"} className="w-full" onClick={() => setActiveView("bancos")}>Archivos Masivos Bancos</Button>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        {activeView === "procesador" && <ProcesadorFondos />}
        {activeView === "bancos" && <ArchivosBancos />}
      </div>
    </div>
  )
}

function ArchivosBancos() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Archivos Masivos Bancos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">Aquí irá la lógica nueva para los archivos de bancos.</p>
      </CardContent>
    </Card>
  )
}

import FundProcessor from "./FundProcessor"

function ProcesadorFondos() {
  return <FundProcessor />
}
