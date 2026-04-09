# Gestión de la App Actual — Guía Técnica

## Pre-requisitos

- Node.js >= 18
- npm / yarn (el repo usa Yarn workspaces)
- `@shoplinedev/cli` — ya incluido como devDependency en `package.json`
- Cuenta en developer.shopline.com con una app creada y credenciales disponibles

---

## 1. Variables de Entorno

Crea `app/.env` (nunca commitear — está en `.gitignore`):

```env
# Credenciales de la app (Developer Center → tu app)
SHOPLINE_APP_KEY=20439b05440d122cca7170784059415adf4c6e28
SHOPLINE_APP_SECRET=<tu_app_secret>

# Scopes separados por coma (deben coincidir con shopline.app.toml)
SCOPES=write_products

# Puertos locales
BACKEND_PORT=3000
FRONTEND_PORT=5173

# Entorno
NODE_ENV=development
```

`shopline.app.toml` (raíz del repo) ya contiene `appKey` y las URLs públicas;
el CLI lo lee automáticamente en cada arranque.

---

## 2. Instalar Dependencias

```bash
# Desde la raíz del monorepo
yarn install
# o con npm (instala todos los workspaces: app/ y web/)
npm install
```

---

## 3. Levantar el Entorno de Desarrollo

```bash
# Desde la raíz
npm run dev
# equivale a: npx shopline app dev
```

Lo que hace `shopline app dev` internamente:

1. Levanta el backend Express (`app/`) en `BACKEND_PORT` usando nodemon
2. Levanta el frontend Vite (`web/`) en `FRONTEND_PORT`
3. Abre un túnel Cloudflare (`*.trycloudflare.com`) y actualiza
   `shopline.app.toml` con la URL pública de forma temporal
4. Imprime la URL del tunnel en consola

> Usa esa URL para configurar **App URL** y **Callback URL** en el
> Developer Center si el tunnel cambió respecto a la sesión anterior.

---

## 4. Ciclo de Cambios Locales → Shopline Admin

**Frontend (`web/src/`):**

```
Edita web/src/pages/index.tsx   (o cualquier archivo bajo web/src/)
            ↓
    Vite HMR recarga automáticamente
            ↓
    El iframe del Admin refleja el cambio sin reiniciar
```

**Backend (`app/src/`):**

```
Edita app/src/index.ts   (o cualquier .ts bajo app/src/)
            ↓
    Nodemon detecta el cambio y reinicia Express
            ↓
    El frontend sigue corriendo; Vite re-proxea al backend reiniciado
```

No se requiere reiniciar `npm run dev` en ninguno de los dos casos.

---

## 5. Forzar Reset de Estado

```bash
npm run dev:reset
# equivale a: npx shopline app dev --reset
```

Úsalo cuando:
- Cambiaste `scopes` en `.env` o `shopline.app.toml` (requiere re-autorización)
- Necesitas forzar re-instalación de la app en tu developer store
- La sesión SQLite está corrupta o el token expiró de forma inesperada

El flag `--reset` limpia el estado del CLI (sesiones cacheadas, tunnel previo)
y reinicia el flujo de autenticación desde cero.

---

## 6. Build de Producción

```bash
npm run build
# equivale a: npx shopline app build
```

Genera:
- `web/dist/` — bundle Vite optimizado (HTML + JS + CSS)
- `app/dist/` — TypeScript compilado a CommonJS

En producción, Express sirve `web/dist/` como archivos estáticos y
el frontend deja de necesitar el proxy de Vite.

Arranque en producción:
```bash
cd app && npm run serve
# equivale a: cross-env NODE_ENV=production node dist/index.js
```

---

## 7. Estructura de Proxy en Dev

```
Browser
  └─→ Vite Dev Server (FRONTEND_PORT: 5173)
         ├── /api/*   → proxy → Express (BACKEND_PORT: 3000)
         └── /*       → proxy → Express (BACKEND_PORT: 3000)  [SPA fallback]
```

Definido en `web/vite.config.ts`. Permite que el frontend llame a
`/api/products/create` sin problemas de CORS, y que Express maneje
la validación de sesión y el OAuth.

---

## 8. Verificar que la App Funciona End-to-End

1. `npm run dev` → copia la URL del tunnel de la salida de consola
2. Developer Center → tu app → actualiza **App URL** y **Callback URL**
   con la nueva URL del tunnel
3. Abre tu Developer Store → Admin → Apps
4. Instala o abre tu app (si ya estaba instalada, puede requerir re-autorización)
5. La app aparece en un iframe dentro del Admin con el mensaje de bienvenida
6. Click en **"Create Product"** → consola del backend debe mostrar la respuesta
   de la API de Shopline con el producto creado

---

## 9. Archivos Clave del Repo

| Archivo | Propósito |
|---|---|
| `shopline.app.toml` | Manifiesto de la app: appKey, appUrl, scopes, callbacks |
| `app/.env` | Credenciales y puertos (no commitear) |
| `app/src/shopline.ts` | Inicialización del SDK: OAuth, sesiones, webhooks |
| `app/src/index.ts` | Servidor Express: rutas, CSP headers, static serving |
| `app/src/controller/webhook/index.ts` | Handler de webhooks con verificación HMAC |
| `app/src/service/product/create.ts` | Llamada real a Admin REST API |
| `web/src/hooks/useAppBridge.ts` | Instancia del cliente AppBridge |
| `web/src/hooks/useAuthenticatedFetch.ts` | Fetch wrapper con Bearer token |
| `web/vite.config.ts` | Proxy de dev + configuración de puertos |
