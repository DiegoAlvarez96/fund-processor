import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para formatear números con separadores de miles
export function formatNumber(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Función para formatear fechas
export function formatDate(dateString: string): string {
  if (!dateString) return ""

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

// Función para normalizar texto para búsqueda
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover acentos
    .trim()
}

// Función para validar CUIT
export function isValidCuit(cuit: string): boolean {
  if (!cuit) return false

  // Remover guiones y espacios
  const cleanCuit = cuit.replace(/[-\s]/g, "")

  // Debe tener 11 dígitos
  if (!/^\d{11}$/.test(cleanCuit)) return false

  return true
}

// Función para formatear CUIT con guiones
export function formatCuit(cuit: string): string {
  if (!cuit) return ""

  const cleanCuit = cuit.replace(/[-\s]/g, "")

  if (cleanCuit.length === 11) {
    return `${cleanCuit.slice(0, 2)}-${cleanCuit.slice(2, 10)}-${cleanCuit.slice(10)}`
  }

  return cuit
}
