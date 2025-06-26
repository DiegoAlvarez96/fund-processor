import { BANK_CONFIGS } from "./bank-config"

export interface TransferData {
  cuentaOrigen: string
  cbuDestino: string
  importeTotal: number
  montoMaximo: number
  tipoTransferencia: string
  banco: string
}

export interface EcheckData {
  cuitBeneficiario: string
  importe: number
  referencia: string
  fechaPago: string
  email?: string
  banco: string
}

// Generar número de operación único (independiente de la cuenta origen)
let operationCounter = 1

function generateOperationNumber(): string {
  const timestamp = Date.now().toString().slice(-8) // Últimos 8 dígitos del timestamp
  const counter = operationCounter.toString().padStart(4, "0") // Contador con 4 dígitos
  operationCounter++
  return `${timestamp}${counter}` // Combina timestamp + contador
}

// Fraccionar transferencias según monto máximo
export function fractionateTransfers(data: TransferData): Array<{
  cuentaOrigen: string
  cbuDestino: string
  importe: number
  numeroOperacion: string
}> {
  const transfers = []
  let remainingAmount = data.importeTotal

  while (remainingAmount > 0) {
    const transferAmount = Math.min(remainingAmount, data.montoMaximo)
    transfers.push({
      cuentaOrigen: data.cuentaOrigen, // Mantiene la cuenta origen original
      cbuDestino: data.cbuDestino,
      importe: transferAmount,
      numeroOperacion: generateOperationNumber(), // Número independiente
    })
    remainingAmount -= transferAmount
  }

  return transfers
}

// Generar archivo de transferencias para Banco de Valores
export function generateValoresTransferFile(transfers: Array<any>, tipoTransferencia: string): string {
  const lines = transfers.map((transfer) => {
    const tipo = tipoTransferencia.replace("MEP-", "")
    return [
      tipo, // GC1, DL0, D20
      transfer.numeroOperacion, // Número de operación único
      transfer.cbuDestino, // CBU destino
      "0299", // Código banco fijo
      "30604731018", // CUIT ordenante fijo
      "BCSD ADCAP ASSET FCI", // Nombre ordenante fijo
      transfer.importe.toFixed(2), // Importe
      "", // Campo vacío
      "N", // Campo N
      "N", // Campo N
      "TRANSFERENCIA AUTOMATICA", // Concepto
      "01", // Campo fijo
      "T", // Campo fijo
    ].join(";")
  })

  return lines.join("\n")
}

// Generar archivo de transferencias para Comafi
export function generateComafiTransferFile(transfers: Array<any>): string {
  const header = "CBU_ORIGEN,CBU_DESTINO,IMPORTE,CONCEPTO,REFERENCIA"
  const lines = transfers.map((transfer) =>
    [
      transfer.cuentaOrigen, // ✅ CUENTA ORIGEN SELECCIONADA
      transfer.cbuDestino,
      transfer.importe.toFixed(2),
      "TRANSFERENCIA AUTOMATICA",
      `OP-${transfer.numeroOperacion}`,
    ].join(","),
  )

  return [header, ...lines].join("\n")
}

// Generar archivo de transferencias para Comercio
export function generateComercioTransferFile(transfers: Array<any>): string {
  const lines = transfers.map((transfer) =>
    [
      transfer.cuentaOrigen, // ✅ CUENTA ORIGEN SELECCIONADA
      transfer.cbuDestino,
      transfer.importe.toFixed(2),
      "TRANSFERENCIA AUTOMATICA",
    ].join(";"),
  )

  return lines.join("\n")
}

// Generar archivo de transferencias para BIND
export function generateBindTransferFile(transfers: Array<any>): string {
  const header = "CBU_ORIGEN,CBU_DESTINO,IMPORTE,CONCEPTO"
  const lines = transfers.map((transfer) =>
    [
      transfer.cuentaOrigen, // ✅ CUENTA ORIGEN SELECCIONADA
      transfer.cbuDestino,
      transfer.importe.toFixed(2),
      "TRANSFERENCIA AUTOMATICA",
    ].join(","),
  )

  return [header, ...lines].join("\n")
}

// Generar archivo de E-checks para Comafi
export function generateComafiEcheckFile(echecks: EcheckData[]): string {
  const header =
    "CUIT del Beneficiario,Importe,Multi_Echeq,Cantidad,Fecha de pago,Caracter,Cruzado,Concepto,Descripción del Echeq"
  const lines = echecks.map((echeck) =>
    [
      echeck.cuitBeneficiario,
      echeck.importe.toFixed(2),
      "NO",
      "1",
      echeck.fechaPago,
      "A la orden",
      "SI",
      "VAR",
      echeck.referencia,
    ].join(","),
  )

  return [header, ...lines].join("\n")
}

// Generar archivo de E-checks para Comercio
export function generateComercioEcheckFile(echecks: EcheckData[]): string {
  const header = "CBU;TIPODECHEQUE;CARACTER;CUITBENEFICIARIO;IMPORTE;REFERENCIA;FECHAPAGO;EMAIL"
  const lines = echecks.map((echeck) =>
    [
      "4320001010003415620011", // CBU fijo para e-checks
      "CC",
      "A la orden",
      echeck.cuitBeneficiario,
      echeck.importe.toFixed(2),
      echeck.referencia,
      echeck.fechaPago,
      echeck.email || "Tesoreria@ad-cap.com.ar",
    ].join(";"),
  )

  return [header, ...lines].join("\n")
}

// Generar archivo de E-checks para BIND
export function generateBindEcheckFile(echecks: EcheckData[]): string {
  const header =
    "CUIT del Beneficiario;Importe;Multi_Echeq;Cantidad;Fecha de pago;Caracter;Cruzado;Concepto;Descripción del Echeq"
  const lines = echecks.map((echeck) =>
    [
      echeck.cuitBeneficiario,
      echeck.importe.toFixed(2),
      "NO",
      "1",
      echeck.fechaPago,
      "A la orden",
      "SI",
      "VAR",
      echeck.referencia,
    ].join(";"),
  )

  return [header, ...lines].join("\n")
}

// Función principal para generar archivos
export function generateBankFile(
  banco: string,
  tipoArchivo: "transferencia" | "echeck",
  data: TransferData | EcheckData[],
): { content: string; filename: string; mimeType: string } {
  const config = BANK_CONFIGS[banco]
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)

  if (tipoArchivo === "transferencia" && !Array.isArray(data)) {
    const transfers = fractionateTransfers(data as TransferData)
    let content = ""
    let filename = ""

    switch (banco) {
      case "banco-valores":
        content = generateValoresTransferFile(transfers, data.tipoTransferencia)
        filename = `MEP_${data.tipoTransferencia.replace("MEP-", "")}_VALORES_${timestamp}.txt`
        break
      case "banco-comafi":
        content = generateComafiTransferFile(transfers)
        filename = `MEP_COMAFI_${data.tipoTransferencia.replace("MEP-", "")}_${timestamp}.csv`
        break
      case "banco-comercio":
        content = generateComercioTransferFile(transfers)
        filename = `TRANSFERENCIAS_COMERCIO_${timestamp}.txt`
        break
      case "banco-bind":
        content = generateBindTransferFile(transfers)
        filename = `TRANSFERENCIAS_BIND_${timestamp}.csv`
        break
    }

    return {
      content,
      filename,
      mimeType: config.fileExtension === "csv" ? "text/csv" : "text/plain",
    }
  } else if (tipoArchivo === "echeck" && Array.isArray(data)) {
    let content = ""
    let filename = ""

    switch (banco) {
      case "banco-comafi":
        content = generateComafiEcheckFile(data as EcheckData[])
        filename = `ECHEQS_COMAFI_${timestamp}.csv`
        break
      case "banco-comercio":
        content = generateComercioEcheckFile(data as EcheckData[])
        filename = `ECHEQS_COMERCIO_${timestamp}.txt`
        break
      case "banco-bind":
        content = generateBindEcheckFile(data as EcheckData[])
        filename = `ECHEQS_BIND_${timestamp}.csv`
        break
    }

    return {
      content,
      filename,
      mimeType: config.fileExtension === "csv" ? "text/csv" : "text/plain",
    }
  }

  throw new Error("Configuración inválida para generar archivo")
}
