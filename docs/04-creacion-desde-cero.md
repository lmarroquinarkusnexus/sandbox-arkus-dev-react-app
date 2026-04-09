# Crear una App Shopline desde Cero — Guía Técnica

## 1. Registrar la App en el Developer Center

1. Entra a developer.shopline.com → **My Apps**
2. Click **Create App**
3. Completa los campos requeridos:

   | Campo | Valor de ejemplo |
   |---|---|
   | App Name | `mi-nueva-app` (solo referencia interna) |
   | App URL | `https://mi-app.com` (raíz del servidor) |
   | Callback URL | `https://mi-app.com/api/auth/callback` |
   | App Type | Public / Custom / Private |

4. Guarda → obtienes **App Key** y **App Secret** (guárdalos en `.env`)

> Para desarrollo local usarás una URL de tunnel (Cloudflare, ngrok, etc.)
> en lugar de un dominio real. Puedes cambiarla en Developer Center en cualquier momento.

---

## 2. Inicializar el Proyecto

```bash
# Estructura mínima de monorepo
mkdir mi-nueva-app && cd mi-nueva-app
npm init -y

# Backend
mkdir app && cd app
npm init -y
npm install @shoplineos/shopline-app-express \
            @shoplineos/shopline-app-session-storage-sqlite \
            express dotenv node-fetch
npm install -D typescript ts-node nodemon @types/express @types/node cross-env
cd ..

# Frontend
mkdir web && cd web
npm create vite@latest . -- --template react-ts
npm install @shoplinedev/appbridge react-router-dom react-i18next i18next
cd ..
```

---

## 3. `shopline.app.toml` (raíz del proyecto)

```toml
appName = "mi-nueva-app"
appKey  = "<APP_KEY_del_Developer_Center>"
appUrl  = "https://mi-app.com"

appCallbackUrlList = [
  "https://mi-app.com/api/auth/callback"
]

isNewWindow   = false   # false = iframe embedded en Admin; true = tab nueva
subPathPrefix = "apps"  # prefijo de ruta en el Admin de Shopline

[access_scopes]
scopes = "read_products,write_products"
```

---

## 4. Variables de Entorno

`app/.env`:

```env
SHOPLINE_APP_KEY=<del Developer Center>
SHOPLINE_APP_SECRET=<del Developer Center>
SHOPLINE_APP_URL=https://mi-app.com
SCOPES=read_products,write_products
BACKEND_PORT=3000
NODE_ENV=development
```

`web/.env` (o `web/.env.local`):

```env
VITE_APP_KEY=<mismo que SHOPLINE_APP_KEY>
FRONTEND_PORT=5173
```

---

## 5. Backend Mínimo (Express + TypeScript)

### `app/src/shopline.ts`

```typescript
import shoplineApp from '@shoplineos/shopline-app-express';
import { SQLiteSessionStorage } from '@shoplineos/shopline-app-session-storage-sqlite';
import { webhookHandler } from './controller/webhook';

const shopline = shoplineApp({
  appKey:         process.env.SHOPLINE_APP_KEY!,
  appSecret:      process.env.SHOPLINE_APP_SECRET!,
  scopes:         process.env.SCOPES!.split(','),
  appUrl:         process.env.SHOPLINE_APP_URL!,
  authPathPrefix: '/api/auth',
  sessionStorage: new SQLiteSessionStorage('./database.sqlite'),
  webhooks: {
    'apps/installed_uninstalled': webhookHandler,
  },
  hooks: {
    afterAuth: async ({ session }) => {
      // Registra todos los webhooks declarados arriba en la tienda recién autenticada
      await shopline.registerWebhooks({ session });
    },
  },
});

export default shopline;
```

### `app/src/index.ts`

```typescript
import 'dotenv/config';
import express from 'express';
import serveStatic from 'serve-static';
import { join } from 'path';
import shopline from './shopline';

const app = express();

// OAuth routes: GET /api/auth  y  GET /api/auth/callback
app.get('/api/auth', shopline.auth);
app.get('/api/auth/callback', shopline.auth);

// Webhook endpoint (body debe llegar como raw Buffer para verificar HMAC)
app.post('/api/webhooks', express.raw({ type: '*/*' }), shopline.processWebhooks);

// CSP headers necesarios para el modo iframe embedded
app.use(shopline.cspHeaders());

// Rutas autenticadas de negocio
app.get(
  '/api/products',
  shopline.validateAuthenticatedSession(),
  async (req, res) => {
    const { session } = res.locals.shopline;
    const response = await fetch(
      `https://${session.handle}.myshopline.com/admin/openapi/v20230901/products/products.json`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } }
    );
    res.json(await response.json());
  }
);

// Sirve el frontend (en producción: web/dist; en dev: manejado por Vite)
if (process.env.NODE_ENV === 'production') {
  app.use(serveStatic(join(process.cwd(), '../web/dist')));
  app.use('/*', (_req, res) => {
    res.sendFile(join(process.cwd(), '../web/dist/index.html'));
  });
}

app.listen(Number(process.env.BACKEND_PORT) || 3000, () => {
  console.log(`Backend running on port ${process.env.BACKEND_PORT || 3000}`);
});
```

---

## 6. Frontend AppBridge (React)

### `web/src/hooks/useAppBridge.ts`

```typescript
import { createApp, shared } from '@shoplinedev/appbridge';
import { useMemo } from 'react';

export function useAppBridge() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const appKey = params.get('appKey') || import.meta.env.VITE_APP_KEY;
    const host   = shared.getHost();
    return createApp({ appKey, host });
  }, []);
}
```

### `web/src/hooks/useAuthenticatedFetch.ts`

```typescript
import { shared } from '@shoplinedev/appbridge';

export function useAuthenticatedFetch(app: ReturnType<typeof createApp>) {
  return async (url: string, options: RequestInit = {}) => {
    const token = await shared.getSessionToken(app);
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers as Record<string, string>),
        'Authorization':    `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    // Si el backend devuelve este header, la sesión expiró → redirigir a reauth
    if (res.headers.get('X-SHOPLINE-API-Request-Failure-Reauthorize') === '1') {
      const reAuthUrl = res.headers.get('X-SHOPLINE-API-Request-Failure-Reauthorize-Url');
      if (reAuthUrl) window.location.assign(reAuthUrl);
    }

    return res;
  };
}
```

### `web/src/pages/index.tsx` (página principal)

```tsx
import { useAppBridge }         from '../hooks/useAppBridge';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

export default function Index() {
  const app   = useAppBridge();
  const fetch = useAuthenticatedFetch(app);

  const handleCreateProduct = async () => {
    const res  = await fetch('/api/products');
    const data = await res.json();
    console.log(data);
  };

  return (
    <div>
      <h1>Mi App Shopline</h1>
      <button onClick={handleCreateProduct}>Crear Producto de Prueba</button>
    </div>
  );
}
```

---

## 7. Proxy Vite para Dev (`web/vite.config.ts`)

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const backendPort = env.VITE_BACKEND_PORT || '3000';

  return {
    plugins: [react()],
    server: {
      host:         'localhost',
      port:         Number(env.VITE_FRONTEND_PORT) || 5173,
      allowedHosts: 'all',   // necesario para el tunnel de Cloudflare
      proxy: {
        '/api': { target: `http://localhost:${backendPort}`, changeOrigin: true },
        '/':    { target: `http://localhost:${backendPort}`, changeOrigin: true },
      },
    },
  };
});
```

---

## 8. Scopes Disponibles

| Scope | Recursos cubiertos |
|---|---|
| `read_products` / `write_products` | Productos, variantes, imágenes, colecciones |
| `read_orders` / `write_orders` | Pedidos, fulfillments, devoluciones |
| `read_customers` / `write_customers` | Clientes, direcciones |
| `read_inventory` / `write_inventory` | Niveles de inventario por ubicación |
| `read_script_tags` / `write_script_tags` | Scripts inyectados en el storefront |
| `read_themes` / `write_themes` | Activos y configuración de temas |

Declara **solo los scopes que tu app necesita**. Añadir scopes a una app
ya instalada obliga al merchant a pasar por el flujo OAuth de nuevo.

---

## 9. Webhooks — Topics y Verificación HMAC

### Topics principales

| Topic | Cuándo se dispara |
|---|---|
| `apps/installed_uninstalled` | El merchant instala o desinstala la app |
| `products/create` | Se crea un producto |
| `products/update` | Se actualiza un producto |
| `orders/create` | Se crea un pedido |
| `orders/paid` | Un pedido es pagado |
| `customers/redact` | GDPR: petición de borrado de datos de cliente |
| `merchants/redact` | GDPR: petición de borrado de datos del merchant |

### Verificación HMAC (obligatoria en producción)

```typescript
import crypto from 'crypto';

export function verifyWebhookHmac(
  rawBody:    Buffer,
  hmacHeader: string,
  appSecret:  string
): boolean {
  const digest = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('base64');
  // timingSafeEqual previene timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(hmacHeader)
  );
}
```

El header que envía Shopline es `X-Shopline-Hmac-Sha256`.
Si la verificación falla, responde con `401` sin procesar el payload.

---

## 10. Llamada a Admin REST API

```typescript
const BASE_URL = `https://${session.handle}.myshopline.com/admin/openapi/v20230901`;

// GET — listar productos
const listRes = await fetch(`${BASE_URL}/products/products.json`, {
  headers: { Authorization: `Bearer ${session.accessToken}` },
});

// POST — crear producto
const createRes = await fetch(`${BASE_URL}/products/products.json`, {
  method: 'POST',
  headers: {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${session.accessToken}`,
  },
  body: JSON.stringify({
    product: {
      title:  'Mi Producto',
      status: 'active',
      variants: [{ price: '19.99', inventory_quantity: 100 }],
    },
  }),
});
```

La versión de API (`v20230901`, `v20260601`, etc.) se especifica en la URL.
Usa siempre la versión más reciente disponible en el Developer Center.

---

## 11. Checklist de Registro para Producción

- [ ] App URL apunta a servidor con TLS válido (HTTPS obligatorio)
- [ ] Callback URL registrada en Developer Center coincide exactamente con el código
- [ ] Scopes en `shopline.app.toml` son idénticos a los de `.env`
- [ ] Verificación HMAC activa en `/api/webhooks` (responde 401 si falla)
- [ ] CSP headers configurados (`shopline.cspHeaders()`) para modo iframe
- [ ] Webhook `apps/installed_uninstalled` elimina la sesión del merchant en uninstall
- [ ] Webhooks GDPR implementados (`customers/redact`, `merchants/redact`)
- [ ] Variables de entorno de producción configuradas en el servidor (no en código)
- [ ] Si es Public App: app enviada a revisión desde Developer Center
- [ ] Si es Payment App: revisión extendida solicitada (3-5 días hábiles)
