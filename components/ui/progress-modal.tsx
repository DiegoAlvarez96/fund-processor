"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface ProgressModalProps {
  isOpen: boolean
  title: string
  message: string
  current: number
  total: number
}

export default function ProgressModal({ isOpen, title, message, current, total }: ProgressModalProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{message}</div>
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
