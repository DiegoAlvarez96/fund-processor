"use client"

import React, { useState, useMemo, useCallback, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { TituloOperacion } from "@/lib/titulos-parser"
import { MERCADO_CONFIG } from "@/lib/titulos-config"

interface VirtualizedTitulosTableProps {
  operaciones: TituloOperacion[]
  filtroMercado: string
  onFiltroChange: (filtro: string) => void
}

const ITEM_HEIGHT = 60 // Altura de cada fila en px
const VISIBLE_ITEMS = 15 // Número de filas visibles
const BUFFER_SIZE = 5 // Filas extra para suavizar el scroll

const VirtualizedTitulosTable = React.memo(
  ({ operaciones, filtroMercado, onFiltroChange }: VirtualizedTitulosTableProps) => {
    const [scrollTop, setScrollTop] = useState(0)
    const [searchTerm, setSearchTerm] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)

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

    // Calcular qué elementos mostrar (memoizado)
    const visibleItems = useMemo(() => {
      const containerHeight = VISIBLE_ITEMS * ITEM_HEIGHT
      const startIndex = Math.floor(scrollTop / ITEM_HEIGHT)
      const endIndex = Math.min(startIndex + VISIBLE_ITEMS + BUFFER_SIZE, operacionesFiltradas.length)
      const actualStartIndex = Math.max(0, startIndex - BUFFER_SIZE)

      return {
        startIndex: actualStartIndex,
        endIndex,
        items: operacionesFiltradas.slice(actualStartIndex, endIndex),
        totalHeight: operacionesFiltradas.length * ITEM_HEIGHT,
        offsetY: actualStartIndex * ITEM_HEIGHT,
      }
    }, [operacionesFiltradas, scrollTop])

    // Manejar scroll (con callback memoizado)
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }, [])

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

        {/* Tabla virtualizada */}
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

          <div
            ref={containerRef}
            className="relative overflow-auto"
            style={{ height: `${VISIBLE_ITEMS * ITEM_HEIGHT}px` }}
            onScroll={handleScroll}
          >
            {/* Contenedor virtual total */}
            <div style={{ height: `${visibleItems.totalHeight}px`, position: "relative" }}>
              {/* Elementos visibles */}
              <div
                style={{
                  transform: `translateY(${visibleItems.offsetY}px)`,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              >
                {visibleItems.items.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    No hay operaciones para mostrar
                  </div>
                ) : (
                  visibleItems.items.map((operacion, index) => (
                    <div
                      key={`${visibleItems.startIndex + index}`}
                      className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 items-center"
                      style={{ height: `${ITEM_HEIGHT}px` }}
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
                      <div className="col-span-1 text-right text-sm">
                        {formatNumber(operacion.precioPromedioCompra)}
                      </div>
                      <div className="col-span-1 text-right text-sm">{formatNumber(operacion.cantidadVendida)}</div>
                      <div className="col-span-1">{getMercadoBadge(operacion.mercado)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Indicador de scroll */}
          {operacionesFiltradas.length > VISIBLE_ITEMS && (
            <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 text-center">
              Mostrando {Math.min(visibleItems.startIndex + 1, operacionesFiltradas.length)} -{" "}
              {Math.min(visibleItems.endIndex, operacionesFiltradas.length)} de {operacionesFiltradas.length}{" "}
              operaciones
            </div>
          )}
        </div>
      </div>
    )
  },
)

VirtualizedTitulosTable.displayName = "VirtualizedTitulosTable"

export default VirtualizedTitulosTable
