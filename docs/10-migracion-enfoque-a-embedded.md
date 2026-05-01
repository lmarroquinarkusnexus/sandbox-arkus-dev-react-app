# Migración: Enfoque A — Embedded con nueva cuenta (email/password)

Esta guía asume que ya completaste el documento `09-nueva-cuenta-shopline-email-password.md` y tienes a la mano:
- `SHOPLINE_APP_KEY` de la nueva app
- `SHOPLINE_APP_SECRET` de la nueva app
- Nombre de la nueva tienda (ej. `test-lab-arkus-v2`)

**Rama git:** `feature/login-embedded`

---

## Qué cambia en esta migración

| Archivo | Cambio |
|---|---|
| `app/.env` | `SHOPLINE_APP_KEY`, `SHOPLINE_APP_SECRET`, `HOST` |
| `shopline.app.toml` | `appKey`, `appUrl`, `appCallbackUrlList` |
| `app/database.sqlite` | Se limpia (nueva tienda = nuevo token) |
| Código fuente | **Nada** — la arquitectura es idéntica |

---

## Paso 1 — Actualizar `app/.env`

Abre `app/.env` y reemplaza las 4 variables de Shopline:

```dotenv
# ── ANTES (cuenta Gmail / tienda original) ──────────────────────
SHOPLINE_APP_KEY=<app_key_original>
SHOPLINE_APP_SECRET=<app_secret_original>
HOST=https://<tunnel_original>.trycloudflare.com
SCOPES=write_products,read_products,write_orders,read_orders,read_customers,write_customers

# ── DESPUÉS (nueva cuenta email/password) ────────────────────────
SHOPLINE_APP_KEY=<nuevo_app_key>
SHOPLINE_APP_SECRET=<nuevo_app_secret>
HOST=https://<nuevo_tunnel>.trycloudflare.com   # se auto-actualiza con npm run dev
SCOPES=write_products,read_products,write_orders,read_orders,read_customers,write_customers
```

> `SCOPES` no cambia. Solo cambian las 3 primeras variables.

---

## Paso 2 — Actualizar `shopline.app.toml`

```toml
# ── ANTES ───────────────────────────────────────────────────────
appName = "sandbox-arkus-dev-react-app"
appKey = "<app_key_original>"
appUrl = "https://<tunnel_original>.trycloudflare.com"
appCallbackUrlList = [
  "https://<tunnel_original>.trycloudflare.com/api/auth/callback"
]

# ── DESPUÉS ─────────────────────────────────────────────────────
appName = "sandbox-arkus-dev-v2"           # nombre de la nueva app
appKey = "<nuevo_app_key>"
appUrl = "https://<nuevo_tunnel>.trycloudflare.com"
appCallbackUrlList = [
  "https://<nuevo_tunnel>.trycloudflare.com/api/auth/callback"
]
isNewWindow = false
subPathPrefix = "apps"
proxyUrl = ""

[access_scopes]
scopes = "write_products,read_products,write_orders,read_orders,read_customers,write_customers"
```

> **Nota**: Al correr `npm run dev`, el CLI de Shopline actualiza automáticamente `appUrl` y `appCallbackUrlList` con la URL del nuevo tunnel de Cloudflare.

---

## Paso 3 — Limpiar la base de datos

La base de datos SQLite almacena el Access Token de la tienda anterior. Para que la nueva tienda pueda autenticarse, hay que limpiarla:

```bash
# Opción A: borrar y recrear (recomendado)
rm app/database.sqlite

# Opción B: script de reset (si existe en el proyecto)
npm run dev:reset
```

El archivo `database.sqlite` se crea automáticamente al iniciar el servidor si no existe.

---

## Paso 4 — Iniciar el servidor de desarrollo

```bash
npm run dev
```

El CLI generará un nuevo tunnel de Cloudflare y actualizará `shopline.app.toml`. Debes copiar la nueva URL y actualizarla también en el Partner Portal (ver doc 09, Paso 6).

---

## Paso 5 — Instalar la app en la nueva tienda

1. Abre el Admin de la nueva tienda: `https://test-lab-arkus-v2.myshopline.com/admin`
2. Ve a **Apps** → busca tu app o usa el link directo del Partner Portal
3. Sigue el flujo OAuth:
   - Shopline te pedirá login → ingresa con **email/password** (no Gmail)
   - Aprueba los permisos de la app
4. La app queda instalada. El `database.sqlite` se puebla con el nuevo Access Token.

---

## Paso 6 — Verificar que la app funciona

1. Navega a la app en el Admin de la nueva tienda
2. Verifica que carga correctamente dentro del iframe
3. Prueba las secciones: Products, Customers, Orders
4. Si la app solicita re-autorización (OAuth redirect), es normal — solo sigue el flujo con email/password

---

## Qué NO cambia

- **Arquitectura**: `isEmbeddedApp: true` — la app sigue siendo embedded
- **AppBridge**: sigue funcionando (SessionToken, Redirect, etc.)
- **Código del backend y frontend**: sin cambios
- **Flujo OAuth**: sigue existiendo, ahora con email/password en lugar de Gmail

---

## Volver a la cuenta original (main)

Para volver a la cuenta de Gmail (rama `main`):

```bash
git checkout main
# .env y shopline.app.toml apuntan a las credenciales originales
npm run dev
```

El `database.sqlite` puede necesitar limpieza si la tienda original ya no reconoce la sesión.
