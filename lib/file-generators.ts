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

// Generar archivo de mismo banco para Banco de Valores
export function generateValoresMismoBancoFile(transfers: Array<any>): string {
  const lines = transfers.map((transfer) => {
    // Determinar observaciones según cuenta destino
    let observaciones = "ADCAP SECURITIES 545" // Default

    // Si es ROFEX
    if (transfer.cbuDestino === "300100000144362") {
      observaciones = "ADCAP SECURITIES 323"
    }
    // Si es MAV ($ o USD) mantiene el default "ADCAP SECURITIES 545"

    return (
      [
        transfer.cuentaOrigen, // Cuenta origen
        transfer.cbuDestino, // Cuenta destino
        transfer.importe.toFixed(2), // Importe
        "CPD", // Concepto fijo
        observaciones, // Observaciones según destino
      ].join(";") + ";\r\n" // ✅ Añadir ;\r\n al final de cada línea
    )
  })

  return lines.join("")
}

// Generar archivo D20 para Banco de Valores
export function generateValoresD20File(transfers: Array<any>): string {
  const lines = transfers.map((transfer) => {
    return (
      [
        "D20", // Tipo fijo
        transfer.cuentaOrigen, // Cuenta origen
        "", // Campo vacío
        transfer.cbuDestino, // Cuenta destino (22500, 22204, etc.)
        "30711610126", // CUIT fijo
        "", // Campo vacío
        transfer.importe.toFixed(2), // Importe
        "1", // Campo fijo
        "N", // Campo fijo
        "S", // Campo fijo
        "97", // Campo fijo
        "", // Campo vacío
        "1", // Campo fijo
        "S0", // Campo fijo
        transfer.cbuDestino, // ✅ Cuenta destino (no importe)
      ].join(";") + ";\r\n" // ✅ Añadir ;\r\n al final de cada línea
    )
  })

  return lines.join("")
}

// Generar archivo DL0 para Banco de Valores
export function generateValoresDL0File(transfers: Array<any>): string {
  const lines = transfers.map((transfer) => {
    const codigoBanco = transfer.cbuDestino.substring(0, 4) // ✅ Primeros 4 dígitos del CBU destino

    return (
      [
        "DL0", // Tipo fijo
        transfer.cuentaOrigen, // Cuenta origen
        transfer.cbuDestino, // CBU destino completo
        codigoBanco, // Código banco (primeros 4 dígitos)
        "30711610126", // CUIT fijo
        "ADCAPSECURITIES ARG", // Nombre ordenante fijo
        transfer.importe.toFixed(2), // Importe
        "VAR", // Campo fijo
        "S", // Campo fijo
        "S", // Campo fijo
        "FONDEO", // Concepto fijo
      ].join(";") + ";\r\n" // ✅ Añadir ;\r\n al final de cada línea
    )
  })

  return lines.join("")
}

// Generar archivo de transferencias para Banco de Valores (GC1 y otros)
export function generateValoresTransferFile(transfers: Array<any>, tipoTransferencia: string): string {
  const lines = transfers.map((transfer) => {
    const tipo = tipoTransferencia.replace("MEP-", "")
    const codigoBanco = transfer.cbuDestino.substring(0, 3) // ✅ Primeros 3 dígitos del CBU destino

    return (
      [
        tipo, // GC1, etc.
        transfer.cuentaOrigen, // Cuenta origen
        transfer.cbuDestino, // CBU destino
        codigoBanco, // ✅ Código banco extraído del CBU destino
        "30604731018", // CUIT ordenante fijo
        "BCSD ADCAP FCI", // Nombre ordenante fijo
        transfer.importe.toFixed(2), // Importe
        "", // Campo vacío
        "N", // Campo N
        "N", // Campo N
        "TRANSFERENCIA AUTOMATICA", // Concepto
        "01", // Campo fijo
        "T", // Campo fijo (removido el ; extra)
      ].join(";") + ";\r\n" // ✅ Añadir ;\r\n al final de cada línea
    )
  })

  return lines.join("")
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
    ].join(";"),
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
        if (data.tipoTransferencia === "mismo-banco") {
          content = generateValoresMismoBancoFile(transfers)
          filename = `MISMO_BANCO_VALORES_${timestamp}.txt`
        } else if (data.tipoTransferencia === "MEP-D20") {
          content = generateValoresD20File(transfers)
          filename = `MEP_D20_VALORES_${timestamp}.txt`
        } else if (data.tipoTransferencia === "MEP-DL0") {
          content = generateValoresDL0File(transfers)
          filename = `MEP_DL0_VALORES_${timestamp}.txt`
        } else {
          content = generateValoresTransferFile(transfers, data.tipoTransferencia)
          filename = `MEP_${data.tipoTransferencia.replace("MEP-", "")}_VALORES_${timestamp}.txt`
        }
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
