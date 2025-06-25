import { type NextRequest, NextResponse } from "next/server"

const PASSWORDS: Record<string, string> = {
  adcap: process.env.PASS_ADCAP!,
  adcap_99: process.env.PASS_ADCAP_99!,
  adcap_1000: process.env.PASS_ADCAP_1000!,
}

async function getToken(user: string): Promise<string | null> {
  if (!PASSWORDS[user]) {
    return null
  }

  const url = "https://ab-fondos.ad-cap.com.ar/broker/login"
  const payload = { username: user, password: PASSWORDS[user] }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.AccessToken
  } catch (error) {
    console.error(`Error al obtener token para ${user}:`, error)
    return null
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, requestId } = await request.json()

    if (!user || !requestId) {
      return NextResponse.json({
        success: false,
        error: "Usuario e ID de solicitud son requeridos",
      })
    }

    // Obtener token
    const token = await getToken(user)
    if (!token) {
      return NextResponse.json({
        success: false,
        error: "Error al obtener token de autenticación",
      })
    }

    // Eliminar solicitud
    const url = `https://ab-fondos.ad-cap.com.ar/broker/assetManager/requests/${requestId}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      return NextResponse.json({
        success: false,
        error: `Error ${response.status}: ${errorData}`,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Solicitud ${requestId} eliminada correctamente`,
    })
  } catch (error: any) {
    console.error("Error eliminando solicitud:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Error interno del servidor",
    })
  }
}
