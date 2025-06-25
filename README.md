# Fund Processor Web App

Aplicación web para procesar solicitudes de fondos de inversión.

## 🧱 Stack Tecnológico

- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- Radix UI
- PNPM

## 🚀 Deploy en Render

### Archivos necesarios

- `package.json` con `"packageManager": "pnpm@10.12.3"`
- `next.config.js` con `output: 'standalone'`
- `pnpm-lock.yaml` (opcional, si usás `--no-frozen-lockfile`)

### Configuración en Render.com

**Build Command:**

```bash
corepack enable && pnpm install --no-frozen-lockfile && pnpm build
```

**Start Command:**

```bash
pnpm start
```

**Variables de entorno:**

- `NODE_VERSION = 20`

### URL de la App

Una vez desplegado, Render te dará una URL tipo:

```
https://fund-processor.onrender.com
```

---

> Si tenés problemas de deploy, asegurate de que el `pnpm-lock.yaml` esté actualizado o usá `--no-frozen-lockfile`.