"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TituloOperacion } from "@/lib/titulos-parser"
import { MERCADO_CONFIG } from "@/lib/titulos-config"

interface TitulosTableProps {
  operaciones: TituloOperacion[]
  filtroMercado: string
  onFiltroChange: (filtro: string) => void
}

export default function TitulosTable({ operaciones, filtroMercado, onFiltroChange }: TitulosTableProps) {
  const operacionesFiltradas =
    filtroMercado === "todos" ? operaciones : operaciones.filter((op) => op.mercado === filtroMercado)

  const formatNumber = (value: string): string => {
    const num = Number.parseFloat(value.replace(/,/g, ""))
    return isNaN(num) ? value : num.toLocaleString("es-AR", { minimumFractionDigits: 2 })
  }

  const getMercadoBadge = (mercado: string) => {
    const config = MERCADO_CONFIG[mercado]
    if (!config) return <Badge variant="outline">{mercado}</Badge>

    return (
      <Badge className={`${config.bgColor} ${config.textColor} border-0`} variant="outline">
        {mercado}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Filtrar por mercado:</span>
        <Select value={filtroMercado} onValueChange={onFiltroChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los mercados</SelectItem>
            <SelectItem value="BYMA">🔵 BYMA</SelectItem>
            <SelectItem value="MAV">🟢 MAV</SelectItem>
            <SelectItem value="MAE">🟡 MAE</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">{operacionesFiltradas.length} operaciones</Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50">
              <TableRow>
                <TableHead className="min-w-[200px]">Cliente</TableHead>
                <TableHead className="min-w-[120px]">CUIT/CUIL</TableHead>
                <TableHead className="min-w-[250px]">Especie</TableHead>
                <TableHead>Plazo</TableHead>
                <TableHead className="min-w-[150px]">Moneda</TableHead>
                <TableHead>Cant. Comprada</TableHead>
                <TableHead>Precio Compra</TableHead>
                <TableHead>Monto Comprado</TableHead>
                <TableHead>Cant. Vendida</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Monto Vendido</TableHead>
                <TableHead>Mercado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operacionesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                    No hay operaciones para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                operacionesFiltradas.map((operacion, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{operacion.denominacionCliente}</TableCell>
                    <TableCell className="font-mono text-sm">{operacion.cuitCuil}</TableCell>
                    <TableCell>{operacion.especie}</TableCell>
                    <TableCell className="text-center">{operacion.plazo}</TableCell>
                    <TableCell>{operacion.moneda}</TableCell>
                    <TableCell className="text-right">{formatNumber(operacion.cantidadComprada)}</TableCell>
                    <TableCell className="text-right">{formatNumber(operacion.precioPromedioCompra)}</TableCell>
                    <TableCell className="text-right">{formatNumber(operacion.montoComprado)}</TableCell>
                    <TableCell className="text-right">{formatNumber(operacion.cantidadVendida)}</TableCell>
                    <TableCell className="text-right">{formatNumber(operacion.precioPromedioVenta)}</TableCell>
                    <TableCell className="text-right">{formatNumber(operacion.montoVendido)}</TableCell>
                    <TableCell>{getMercadoBadge(operacion.mercado)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
