"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface ProgressModalProps {
  /** Controla la apertura del modal */
  isOpen: boolean
  /** Título que se muestra arriba de la barra */
  title: string
  /** Mensaje descriptivo de la etapa actual */
  message: string
  /** Registros procesados hasta el momento */
  current: number
  /** Registros totales a procesar */
  total: number
}

/**
 * Muestra un modal con barra de progreso bloqueando la interfaz
 * hasta que finalice el procesamiento.
 */
export default function ProgressModal({ isOpen, title, message, current, total }: ProgressModalProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">{message}</p>

          <div className="space-y-2">
            <Progress value={percentage} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {current} de {total}
              </span>
              <span>{percentage}%</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
