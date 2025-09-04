 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/app/api/process-transaction/route.ts b/app/api/process-transaction/route.ts
index ae3347a8459a134aa1a54bc0dbdfc3768d0beda0..56b5e1c86bf39b4415177d77e8c9dd61a83172fd 100644
--- a/app/api/process-transaction/route.ts
+++ b/app/api/process-transaction/route.ts
@@ -1,127 +1,136 @@
 import { type NextRequest, NextResponse } from "next/server"
+import fs from "fs"
+import https from "https"
 
 const PASSWORDS: Record<string, string> = {
   adcap: process.env.PASS_ADCAP!,
   adcap_99: process.env.PASS_ADCAP_99!,
   adcap_1000: process.env.PASS_ADCAP_1000!,
 }
 
+const httpsAgent = new https.Agent({
+  ca: fs.readFileSync(process.env.ADCAP_CA_CERT_PATH!, "utf8"),
+})
+
 
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
+      agent: httpsAgent,
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
+    agent: httpsAgent,
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
+    agent: httpsAgent,
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
 
EOF
)
