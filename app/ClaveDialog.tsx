'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface ClaveDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const PROCESADOR_SECRET = process.env.NEXT_PUBLIC_PROCESADOR_SECRET ?? ""

export default function ClaveDialog({ open, onClose, onSuccess }: ClaveDialogProps) {
  const [password, setPassword] = useState("")
  const { toast } = useToast()

  const handleConfirm = () => {
    if (password === PROCESADOR_SECRET) {
      onSuccess()
      onClose()
      setPassword("")
    } else {
      toast({
        title: "Clave incorrecta",
        description: "La clave ingresada no es válida dialog",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clave requerida</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Clave de seguridad</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresá tu clave secreta"
          />
          <div className="flex gap-2 pt-4">
            <Button onClick={handleConfirm} className="flex-1 bg-green-600 hover:bg-green-700">Confirmar</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
