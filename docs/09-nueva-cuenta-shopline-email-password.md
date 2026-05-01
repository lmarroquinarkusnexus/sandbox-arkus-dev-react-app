# Guía: Crear nueva cuenta Shopline con email/password

Esta guía cubre la creación de toda la infraestructura necesaria para tener una cuenta Shopline independiente de Gmail, con credenciales propias (email/password).

---

## Paso 1 — Crear cuenta Partner con email/password

1. Ve a [https://developer.myshopline.com](https://developer.myshopline.com)
2. Haz clic en **Sign Up** (esquina superior derecha)
3. Selecciona **"Sign up with email"** (NO uses "Continue with Google")
4. Llena el formulario:
   - **Email**: usa un email dedicado (ej. `dev-shopline@tudominio.com`)
   - **Password**: mínimo 8 caracteres, combina letras y números
   - **Store name / Company name**: puede ser el nombre de tu empresa o proyecto
5. Verifica el email (Shopline envía un correo de confirmación)
6. Completa el onboarding (país, tipo de negocio — puedes elegir "Developer" o "Agency")

> **Nota**: Esta cuenta Partner es separada de cualquier cuenta de merchant. Es la cuenta desde la que desarrollas y administras apps.

---

## Paso 2 — Crear una tienda de prueba (development store)

Necesitas una tienda para instalar y probar la app.

1. En el Partner Dashboard, ve a **Stores** → **Create store**
2. Selecciona **"Development store"**
3. Configura la tienda:
   - **Store name**: `test-lab-arkus-v2` (o el nombre que prefieras)
   - **Store URL**: se auto-genera como `test-lab-arkus-v2.myshopline.com`
   - **Password**: escoge una contraseña para acceder al Admin de la tienda
4. Haz clic en **Create store**

La tienda queda accesible en:
- Admin: `https://test-lab-arkus-v2.myshopline.com/admin`
- Partner Dashboard: aparece en la lista de tiendas

---

## Paso 3 — Crear la app en el Partner Portal

1. En el Partner Dashboard, ve a **Apps** → **Create app**
2. Selecciona **"Custom app"** (para uso privado / desarrollo)
3. Llena los campos básicos:
   - **App name**: `sandbox-arkus-dev-v2` (o el nombre que prefieras)
   - **App URL**: pon un placeholder por ahora, ej. `https://localhost:3000`
     - Lo actualizarás con la URL de Cloudflare al correr `npm run dev`
   - **Callback URL**: `https://localhost:3000/api/auth/callback`
     - También se actualizará al correr `npm run dev`
4. Haz clic en **Create app**

---

## Paso 4 — Obtener las credenciales de la app

Después de crear la app, Shopline muestra las credenciales:

1. Ve a la sección **App credentials** (o "API keys") dentro de la app recién creada
2. Copia y guarda en un lugar seguro:
   - **App Key** (equivale a `SHOPLINE_APP_KEY` en el `.env`)
   - **App Secret** (equivale a `SHOPLINE_APP_SECRET` en el `.env`)

> **IMPORTANTE**: El App Secret solo se muestra una vez. Si lo pierdes tendrás que regenerarlo.

Estructura de credenciales:
```
App Key:    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (40 chars hex)
App Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (40 chars hex)
```

---

## Paso 5 — Configurar los permisos (scopes) de la app

1. En la configuración de la app, busca la sección **API access scopes** o **Permissions**
2. Activa los siguientes scopes:
   - `read_products`
   - `write_products`
   - `read_orders`
   - `write_orders`
   - `read_customers`
   - `write_customers`
3. Guarda los cambios

---

## Paso 6 — Configurar App URL y Callback URL (cuando tengas tunnel)

Al correr `npm run dev`, Shopline CLI genera automáticamente una URL de Cloudflare tunnel. Debes actualizar la app en el portal:

1. Corre `npm run dev` en el proyecto — el CLI genera una URL tipo:
   ```
   https://abc-def-ghi.trycloudflare.com
   ```
2. En el Partner Dashboard → tu app → **App setup**:
   - **App URL**: `https://abc-def-ghi.trycloudflare.com`
   - **Callback URLs**: `https://abc-def-ghi.trycloudflare.com/api/auth/callback`
3. Guarda los cambios en el portal

> **Nota**: `npm run dev` también actualiza `shopline.app.toml` automáticamente con la nueva URL del tunnel. Cada vez que reinicias el dev server, la URL cambia y hay que actualizarla en el portal.

---

## Paso 7 — Instalar la app en la tienda de prueba

1. En el Partner Dashboard → tu app → **Test on development store**
2. Selecciona la tienda `test-lab-arkus-v2`
3. Haz clic en **Install app**
4. Shopline redirigirá al flujo OAuth:
   - Te pedirá que inicies sesión en Shopline con tu **email/password** (no Gmail)
   - Luego pedirá aprobación de los permisos
5. Aprueba los permisos
6. La app queda instalada y el `database.sqlite` se puebla con el Access Token

---

## Resumen de credenciales a guardar

| Variable | Dónde usarla |
|---|---|
| `SHOPLINE_APP_KEY` | `app/.env` y `shopline.app.toml` |
| `SHOPLINE_APP_SECRET` | `app/.env` |
| URL del Admin de la tienda | Para acceder a `test-lab-arkus-v2.myshopline.com/admin` |
| Password del Admin | Acceso manual al Admin de la tienda |

Ver el documento `10-migracion-enfoque-a-embedded.md` para los pasos exactos de migración del código.
