"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

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
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">{message}</div>
          {total > 0 && (
            <>
              <Progress value={percentage} className="w-full" />
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  {current} de {total}
                </span>
                <span>{percentage}%</span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
