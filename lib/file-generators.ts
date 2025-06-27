import { BANK_CONFIGS, getCuitByCBU } from "./bank-config"

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

// Generar timestamp para transferencias inmediatas
function generateTimestamp(): string {
  return Date.now().toString()
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

// Generar archivo de transferencias inmediatas para Banco de Valores
export function generateValoresInmediataFile(transfers: Array<any>, data: TransferData): string {
  // Obtener CUIT del CBU destino
  const cuitInfo = getCuitByCBU(data.tipoTransferencia, data.banco, data.cbuDestino)
  const cuitDestino = cuitInfo?.cuit || "30711610126" // CUIT por defecto

  const lines = transfers.map((transfer) => {
    const timestamp = generateTimestamp()

    return [
      "*M*", // Tipo de registro fijo
      transfer.cbuDestino, // CBU/CVU destino
      transfer.importe.toFixed(2), // Importe
      "VAR", // Motivo (obligatorio)
      "TRANSFER INM", // Motivo (no obligatorio)
      timestamp, // Timestamp
      "observa", // Observaciones
      cuitDestino, // CUIT de la cuenta de crédito (dinámico)
      "", // Espacios en blanco
    ].join(";")
  })

  return lines.join("\n")
}

// Generar archivo de mismo banco para Banco de Valores
export function generateValoresMismoBancoFile(transfers: Array<any>, data: TransferData): string {
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
export function generateValoresD20File(transfers: Array<any>, data: TransferData): string {
  // Obtener CUIT del CBU destino
  const cuitInfo = getCuitByCBU(data.tipoTransferencia, data.banco, data.cbuDestino)
  const cuitDestino = cuitInfo?.cuit || "30711610126" // CUIT por defecto

  const lines = transfers.map((transfer) => {
    return (
      [
        "D20", // Tipo fijo
        transfer.cuentaOrigen, // Cuenta origen
        "", // Campo vacío
        transfer.cbuDestino, // Cuenta destino (22500, 22204, etc.)
        cuitDestino, // CUIT dinámico según CBU destino
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
export function generateValoresDL0File(transfers: Array<any>, data: TransferData): string {
  // Obtener CUIT y nombre del CBU destino
  const cuitInfo = getCuitByCBU(data.tipoTransferencia, data.banco, data.cbuDestino)
  const cuitDestino = cuitInfo?.cuit || "30711610126" // CUIT por defecto
  const nombreOrdenante = cuitInfo?.nombre || "ADCAPSECURITIES ARG" // Nombre por defecto

  const lines = transfers.map((transfer) => {
    const codigoBanco = transfer.cbuDestino.substring(0, 4) // ✅ Primeros 4 dígitos del CBU destino

    return (
      [
        "DL0", // Tipo fijo
        transfer.cuentaOrigen, // Cuenta origen
        transfer.cbuDestino, // CBU destino completo
        codigoBanco, // Código banco (primeros 4 dígitos)
        cuitDestino, // CUIT dinámico
        nombreOrdenante, // Nombre dinámico
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
export function generateValoresTransferFile(
  transfers: Array<any>,
  tipoTransferencia: string,
  data: TransferData,
): string {
  // Obtener CUIT y nombre del CBU destino
  const cuitInfo = getCuitByCBU(tipoTransferencia, data.banco, data.cbuDestino)
  const cuitOrdenante = cuitInfo?.cuit || "30604731018" // CUIT por defecto
  const nombreOrdenante = cuitInfo?.nombre || "BCSD ADCAP FCI" // Nombre por defecto

  const lines = transfers.map((transfer) => {
    const tipo = tipoTransferencia.replace("MEP-", "")
    const codigoBanco = transfer.cbuDestino.substring(0, 3) // ✅ Primeros 3 dígitos del CBU destino

    return (
      [
        tipo, // GC1, etc.
        transfer.cuentaOrigen, // Cuenta origen
        transfer.cbuDestino, // CBU destino
        codigoBanco, // ✅ Código banco extraído del CBU destino
        cuitOrdenante, // CUIT dinámico
        nombreOrdenante, // Nombre dinámico
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

// Generar archivo de transferencias para Comafi (DL0 y GC1)
export function generateComafiTransferFile(transfers: Array<any>, data: TransferData): string {
  // Obtener CUIT y nombre del CBU destino
  const cuitInfo = getCuitByCBU(data.tipoTransferencia, data.banco, data.cbuDestino)
  const cuitDestino = cuitInfo?.cuit || "30711610126" // CUIT por defecto
  const nombreOrdenante = cuitInfo?.nombre || "ADCAP SECURITIES ARGENTINA SA" // Nombre por defecto

  const lines = []

  // Header
  lines.push(
    "Tipo de Transferencia;Codigo;IMPORTE;CONCEPTO / MOTIVO;NUMERO DE CBU - ORDENANTE;C.U.I.T./C.U.I.L. ORDENANTE;NOMBRE ORDENANTE;ORDENANTE PEP;NUMERO DE CBU - BENEFICIARIO;NRO.DE CUIT/CUIL BENEFICIARIO;;;",
  )

  // Transferencias
  transfers.forEach((transfer) => {
    lines.push(
      `Transferencias al mismo titular $;DL0;${transfer.importe.toFixed(2).replace(".", ",")};VAR;${transfer.cuentaOrigen};${cuitDestino};${nombreOrdenante};NO;${transfer.cbuDestino};${cuitDestino};;;`,
    )
  })

  // Footer con declaración
  lines.push(
    "VAR - Varios   ;;;;;Afirmamos que los datos consignados en la presente, son correctos completos y que esta declaración se ha confeccionado sin omitir ni falsear dato alguno, siendo fiel expresión de la verdad.  Asimismo, declaramos que los fondos de la operatoria provienen de actividad/es lícita/s de acuerdo a la normativa vigente en materia de Prevención de Lavado de Dinero y Financiamiento del Terrorismo.;;;;;;;",
  )

  return lines.join("\n")
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

// Reemplazar la función generateComafiEcheckFile con el formato correcto:

// Generar archivo de E-checks para Comafi
export function generateComafiEcheckFile(echecks: EcheckData[]): string {
  const lines = []

  // Header con todos los campos
  lines.push(
    "tipo;cantidad;modo;cuit/cuil;nombre_beneficiario;monto;fecha;motivo_pago;cmc7;email;texto_email;referencia_codigo_1;referencia_valor_1;referencia_codigo_2;referencia_valor_2;referencia_codigo_3;referencia_valor_3;caracter;concepto",
  )

  // Calcular cantidad y monto total
  const cantidad = echecks.length
  const montoTotal = echecks.reduce((sum, echeck) => sum + echeck.importe, 0)

  // Línea H (header con totales)
  lines.push(`H;${cantidad};;;;${montoTotal.toFixed(2).replace(".", ",")};;;;;;;;;;;;;`)

  // Líneas R (registros de e-checks)
  echecks.forEach((echeck) => {
    lines.push(
      [
        "R", // Tipo de registro
        "", // cantidad (vacío para registros)
        "1", // modo
        echeck.cuitBeneficiario, // cuit/cuil
        echeck.referencia, // nombre_beneficiario (usamos referencia como nombre)
        echeck.importe
          .toFixed(2)
          .replace(".", ","), // monto con coma decimal
        echeck.fechaPago
          .split("-")
          .reverse()
          .join("/"), // fecha en formato DD/MM/YYYY
        "Op Bursatil", // motivo_pago
        "", // cmc7 (vacío)
        echeck.email || "tesoreria@ad-cap.com.ar", // email
        "echeq", // texto_email
        "Rescate", // referencia_codigo_1
        "22200000000000000000", // referencia_valor_1 (corregido)
        "1111111111", // referencia_codigo_2
        "22200000000000000000", // referencia_valor_2 (corregido)
        "1111111111", // referencia_codigo_3
        "22200000000000000000", // referencia_valor_3 (corregido)
        "1", // caracter
        "Varios", // concepto
      ].join(";"),
    )
  })

  return lines.join("\n")
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
        if (data.tipoTransferencia === "inmediata") {
          content = generateValoresInmediataFile(transfers, data as TransferData)
          filename = `INMEDIATA_VALORES_${timestamp}.txt`
        } else if (data.tipoTransferencia === "mismo-banco") {
          content = generateValoresMismoBancoFile(transfers, data as TransferData)
          filename = `MISMO_BANCO_VALORES_${timestamp}.txt`
        } else if (data.tipoTransferencia === "MEP-D20") {
          content = generateValoresD20File(transfers, data as TransferData)
          filename = `MEP_D20_VALORES_${timestamp}.txt`
        } else if (data.tipoTransferencia === "MEP-DL0") {
          content = generateValoresDL0File(transfers, data as TransferData)
          filename = `MEP_DL0_VALORES_${timestamp}.txt`
        } else {
          content = generateValoresTransferFile(transfers, data.tipoTransferencia, data as TransferData)
          filename = `MEP_${data.tipoTransferencia.replace("MEP-", "")}_VALORES_${timestamp}.txt`
        }
        break
      case "banco-comafi":
        content = generateComafiTransferFile(transfers, data as TransferData)
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
