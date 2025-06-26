import { type NextRequest, NextResponse } from "next/server"

// Clave secreta (en producción debería estar en variables de entorno)
const SECRET_KEY = process.env.PROCESADOR_SECRET

export async function POST(request: NextRequest) {
  try {
    const { secretKey } = await request.json()

    if (!secretKey) {
      return NextResponse.json({
        success: false,
        error: "Clave secreta requerida",
      })
    }

    // Validar clave secreta
    if (secretKey === SECRET_KEY) {
      return NextResponse.json({
        success: true,
        message: "Autenticación exitosa",
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Clave secreta incorrecta",
      })
    }
  } catch (error) {
    console.error("Error en autenticación:", error)
    return NextResponse.json({
      success: false,
      error: "Error interno del servidor",
    })
  }
}
