"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import type { TituloOperacion } from "@/lib/titulos-parser"
import { MERCADO_CONFIG } from "@/lib/titulos-config"

interface PaginatedTitulosTableProps {
  operaciones: TituloOperacion[]
  filtroMercado: string
  onFiltroChange: (filtro: string) => void
}

const ITEMS_PER_PAGE = 10

const PaginatedTitulosTable = React.memo(
  ({ operaciones, filtroMercado, onFiltroChange }: PaginatedTitulosTableProps) => {
    const [currentPage, setCurrentPage] = useState(1)
    const [searchTerm, setSearchTerm] = useState("")

    // Filtrar operaciones (memoizado)
    const operacionesFiltradas = useMemo(() => {
      let filtered = filtroMercado === "todos" ? operaciones : operaciones.filter((op) => op.mercado === filtroMercado)

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        filtered = filtered.filter(
          (op) =>
            op.denominacionCliente.toLowerCase().includes(term) ||
            op.cuitCuil.includes(term) ||
            op.especie.toLowerCase().includes(term),
        )
      }

      return filtered
    }, [operaciones, filtroMercado, searchTerm])

    // Calcular paginación
    const totalPages = Math.ceil(operacionesFiltradas.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentItems = operacionesFiltradas.slice(startIndex, endIndex)

    // Reset página cuando cambian los filtros
    React.useEffect(() => {
      setCurrentPage(1)
    }, [filtroMercado, searchTerm])

    // Formatear números (memoizado)
    const formatNumber = useCallback((value: string): string => {
      const num = Number.parseFloat(value.replace(/,/g, ""))
      return isNaN(num) ? value : num.toLocaleString("es-AR", { minimumFractionDigits: 2 })
    }, [])

    // Obtener badge de mercado (memoizado)
    const getMercadoBadge = useCallback((mercado: string) => {
      const config = MERCADO_CONFIG[mercado]
      if (!config) return <Badge variant="outline">{mercado}</Badge>

      return (
        <Badge className={`${config.bgColor} ${config.textColor} border-0`} variant="outline">
          {mercado}
        </Badge>
      )
    }, [])

    return (
      <div className="space-y-4">
        {/* Controles de filtrado */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
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
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar cliente, CUIT o especie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>

          <Badge variant="outline">{operacionesFiltradas.length} operaciones</Badge>
        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700">
              <div className="col-span-2">Cliente</div>
              <div className="col-span-1">CUIT/CUIL</div>
              <div className="col-span-3">Especie</div>
              <div className="col-span-1">Plazo</div>
              <div className="col-span-1">Moneda</div>
              <div className="col-span-1">Cant. Comp.</div>
              <div className="col-span-1">Precio Comp.</div>
              <div className="col-span-1">Cant. Vend.</div>
              <div className="col-span-1">Mercado</div>
            </div>
          </div>

          <div className="min-h-[600px]">
            {currentItems.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">No hay operaciones para mostrar</div>
            ) : (
              currentItems.map((operacion, index) => (
                <div
                  key={`${startIndex + index}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 items-center"
                >
                  <div className="col-span-2 font-medium text-sm truncate" title={operacion.denominacionCliente}>
                    {operacion.denominacionCliente}
                  </div>
                  <div className="col-span-1 font-mono text-xs truncate" title={operacion.cuitCuil}>
                    {operacion.cuitCuil}
                  </div>
                  <div className="col-span-3 text-sm truncate" title={operacion.especie}>
                    {operacion.especie}
                  </div>
                  <div className="col-span-1 text-center text-sm">{operacion.plazo}</div>
                  <div className="col-span-1 text-sm truncate">{operacion.moneda}</div>
                  <div className="col-span-1 text-right text-sm">{formatNumber(operacion.cantidadComprada)}</div>
                  <div className="col-span-1 text-right text-sm">{formatNumber(operacion.precioPromedioCompra)}</div>
                  <div className="col-span-1 text-right text-sm">{formatNumber(operacion.cantidadVendida)}</div>
                  <div className="col-span-1">{getMercadoBadge(operacion.mercado)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {startIndex + 1} - {Math.min(endIndex, operacionesFiltradas.length)} de{" "}
              {operacionesFiltradas.length} operaciones
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  },
)

PaginatedTitulosTable.displayName = "PaginatedTitulosTable"

export default PaginatedTitulosTable
