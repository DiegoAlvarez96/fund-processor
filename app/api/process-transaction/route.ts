import { type NextRequest, NextResponse } from "next/server"

const PASSWORDS: Record<string, string> = {
  adcap: ",_",
  adcap_99: "@",
  adcap_1000: ")],",
}

async function getToken(user: string): Promise<string | null> {
  if (!PASSWORDS[user]) {
    console.log(`Usuario no parametrizado: ${user}`)
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
    console.log(`TOKEN OK para ${user}`)
    return data.AccessToken
  } catch (error) {
    console.error(`Error al obtener token para ${user}:`, error)
    return null
  }
}

async function suscribir(token: string, fci: string, monto: string, user: string) {
  const url = `https://ab-fondos.ad-cap.com.ar/broker/assetManager/mutual_funds/${fci}/requests/subscription`
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const payload: any = { amount: Number.parseFloat(monto) }
  if (user === "adcap_1000") {
    payload.bank_account_id = "38"
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(JSON.stringify(errorData))
  }

  return response.json()
}

async function rescatar(
  token: string,
  fci: string,
  importe: string,
  cantidad: string,
  user: string,
  tradeDate?: string,
  settlementDate?: string,
) {
  const isAmount = Number.parseFloat(importe) > 0
  const url = `https://ab-fondos.ad-cap.com.ar/broker/assetManager/mutual_funds/${fci}/requests/redemption`
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const payload: any = {
    isTotal: false,
    isAmount: isAmount,
  }

  if (isAmount) {
    payload.amount = Number.parseFloat(importe)
  } else {
    payload.shares = Number.parseFloat(cantidad)
  }

  if (user === "adcap_1000") {
    payload.bank_account_id = "38"
  }

  if (tradeDate) payload.trade_date = tradeDate
  if (settlementDate) payload.settlement_date = settlementDate

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(JSON.stringify(errorData))
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const transaction = await request.json()
    const { cuotapartista, tipo, fci, importe, cantidad, fechaConcertacion, fechaLiquidacion } = transaction

    // Obtener token
    const token = await getToken(cuotapartista)
    if (!token) {
      return NextResponse.json({
        success: false,
        error: "Error al obtener token de autenticación",
      })
    }

    // Limpiar importe (remover caracteres no numéricos excepto punto)
    const cleanImporte = importe.replace(/[^\d.]/g, "")

    let response
    if (tipo === "SUSC") {
      response = await suscribir(token, fci, cleanImporte, cuotapartista)
    } else if (tipo === "RESC") {
      response = await rescatar(
        token,
        fci,
        cleanImporte,
        cantidad,
        cuotapartista,
        fechaConcertacion || undefined,
        fechaLiquidacion || undefined,
      )
    } else {
      return NextResponse.json({
        success: false,
        error: "Tipo de operación no válido",
      })
    }

    return NextResponse.json({
      success: true,
      description: response.description || "Operación exitosa",
      mutual_fund_request_id: response.mutual_fund_request_id,
      data: response,
    })
  } catch (error: any) {
    console.error("Error procesando transacción:", error)

    let errorMessage = "Error desconocido"

    try {
      const errorData = JSON.parse(error.message)
      if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors[0]?.msg || errorData.description || errorMessage
      } else {
        errorMessage = errorData.description || errorData.error || errorMessage
      }
    } catch {
      errorMessage = error.message || errorMessage
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    })
  }
}
