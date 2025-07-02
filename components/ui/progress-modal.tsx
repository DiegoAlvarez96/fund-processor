"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface ProgressModalProps {
  isOpen: boolean
  progress: number
  currentStep: string
  processedItems: number
  totalItems: number
}

export default function ProgressModal({
  isOpen,
  progress,
  currentStep,
  processedItems,
  totalItems,
}: ProgressModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <div className="flex flex-col items-center space-y-6 py-6">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <h3 className="text-lg font-semibold">Procesando Datos</h3>
          </div>

          <div className="w-full space-y-4">
            <Progress value={progress} className="w-full h-3" />

            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-700">{currentStep}</p>
              <p className="text-xs text-gray-500">
                {processedItems} de {totalItems} líneas procesadas ({Math.round(progress)}%)
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
