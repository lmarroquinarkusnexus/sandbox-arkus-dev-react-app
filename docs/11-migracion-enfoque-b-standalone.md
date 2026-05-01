# Migración: Enfoque B — Standalone con login propio

Esta guía cubre la conversión de la app de embedded (dentro del Admin de Shopline) a una **aplicación web independiente** con su propio formulario de login.

**Rama git:** `feature/login-standalone`

> **Advertencia**: Esta migración es extensa. La app resultante NO es publicable en el App Store de Shopline bajo las políticas actuales. Ver `docs/08-analisis-auth-enfoques.md` para el análisis completo.

---

## Resumen de qué cambia

| Componente | Antes (embedded) | Después (standalone) |
|---|---|---|
| `isEmbeddedApp` | `true` | `false` |
| Login | OAuth redirect a Shopline | Formulario propio email/password |
| Sesión | AppBridge JWT (corta duración) | JWT propio (configurable) |
| `shared.getSessionToken` | Disponible | **No disponible** |
| AppBridge | Funciona | **No funciona** |
| Shopline token | Se obtiene por OAuth cada vez | Se obtiene **una sola vez** (setup) |
| Dónde vive la app | iframe en Shopline Admin | URL propia |

---

## Parte 1 — Setup inicial: obtener el token de Shopline

El token OAuth de Shopline se obtiene **una sola vez** y se almacena permanentemente. Todos los usuarios de la app comparten este token para llamar a la Shopline API.

### 1.1 Crear la app en el Partner Portal

Puedes usar la misma tienda que en el Enfoque A, pero necesitas una **app distinta** (o la misma con `isEmbeddedApp: false`):

1. En el Partner Dashboard → Apps → Create app
2. **App URL**: `https://tu-app.com` (la URL final de tu aplicación)
3. **Callback URL**: `https://tu-app.com/api/auth/callback`
4. Copia `App Key` y `App Secret`

### 1.2 Correr el flujo OAuth una sola vez

```bash
# Con el servidor corriendo en modo embedded (temporalmente):
# 1. Instala la app en la tienda de prueba normalmente
# 2. El token queda guardado en database.sqlite
# 3. Copia el token del SQLite para usarlo como variable de entorno

# En Node.js (para extraer el token):
node -e "
const db = require('better-sqlite3')('app/database.sqlite');
const row = db.prepare('SELECT * FROM sessions LIMIT 1').get();
console.log(JSON.stringify(row, null, 2));
"
```

Guarda el `access_token` resultante como variable de entorno permanente:
```
SHOPLINE_ACCESS_TOKEN=<token_extraido>
SHOPLINE_SHOP_HANDLE=test-lab-arkus-v2
```

---

## Parte 2 — Cambios en el backend

### 2.1 Cambiar `isEmbeddedApp` en `app/src/shopline.ts`

```typescript
// ANTES
const shopline = shoplineApp({
  isEmbeddedApp: true,
  apiKey: process.env.SHOPLINE_APP_KEY!,
  apiSecretKey: process.env.SHOPLINE_APP_SECRET!,
  scopes: process.env.SCOPES!,
  hostName: process.env.HOST!.replace(/https?:\/\//, ''),
  hostScheme: 'https',
});

// DESPUÉS
const shopline = shoplineApp({
  isEmbeddedApp: false,   // ← Cambio clave
  apiKey: process.env.SHOPLINE_APP_KEY!,
  apiSecretKey: process.env.SHOPLINE_APP_SECRET!,
  scopes: process.env.SCOPES!,
  hostName: process.env.HOST!.replace(/https?:\/\//, ''),
  hostScheme: 'https',
});
```

### 2.2 Reemplazar `validateAuthentication` por middleware propio

Con `isEmbeddedApp: false`, el middleware `validateAuthentication` del SDK ya no valida JWTs de AppBridge. Hay que reemplazarlo por un middleware de sesión propio.

Instalar dependencias:
```bash
cd app
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

Crear `app/src/middleware/auth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
```

### 2.3 Crear rutas de login en `app/src/index.ts`

Agregar las siguientes rutas antes de las rutas protegidas:

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Usuarios hardcodeados (o usar base de datos)
const USERS = [
  {
    id: '1',
    email: process.env.ADMIN_EMAIL!,
    passwordHash: process.env.ADMIN_PASSWORD_HASH!,
    name: 'Admin',
  },
];

// POST /api/login
app.post('/api/login', express.json(), async (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '8h' });
  res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
});

// POST /api/logout
app.post('/api/logout', (_req, res) => {
  res.json({ success: true });
});
```

### 2.4 Reemplazar `validateAuthentication` en todas las rutas

En `app/src/index.ts`, reemplaza todas las ocurrencias de:
```typescript
app.get('/api/products', validateAuthentication, getProductsController);
// etc.
```

Por:
```typescript
import { requireAuth } from './middleware/auth';

app.get('/api/products', requireAuth, getProductsController);
// etc.
```

### 2.5 Cambiar cómo se obtiene el token de Shopline en los controllers

Los controllers actuales obtienen el Shopline token de la sesión AppBridge:
```typescript
// ANTES (embedded)
const { shop, token } = res.locals.shopline.session;
```

Con standalone, el token viene de una variable de entorno:
```typescript
// DESPUÉS (standalone)
const shop = process.env.SHOPLINE_SHOP_HANDLE!;
const token = process.env.SHOPLINE_ACCESS_TOKEN!;
```

Este cambio hay que aplicarlo en **todos los controllers** (`app/src/controller/`).

---

## Parte 3 — Cambios en el frontend

### 3.1 Eliminar dependencia de AppBridge para auth

El hook `useAuthenticatedFetch` actual usa `shared.getSessionToken()` de AppBridge para obtener el JWT. Hay que reemplazarlo:

Modificar `web/src/hooks/useAuthenticatedFetch.ts`:
```typescript
// ANTES: obtiene token de AppBridge
import { useAppBridge } from './useAppBridge';

export function useAuthenticatedFetch() {
  const app = useAppBridge();
  return async (url: string, options?: RequestInit) => {
    const token = await shared.getSessionToken(app);
    return fetch(url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${token}` },
    });
  };
}

// DESPUÉS: lee token del localStorage (almacenado al hacer login)
export function useAuthenticatedFetch() {
  return async (url: string, options?: RequestInit) => {
    const token = localStorage.getItem('auth_token') ?? '';
    return fetch(url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${token}` },
    });
  };
}
```

### 3.2 Crear la página de login `web/src/pages/login.tsx`

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? 'Error al iniciar sesión');
        return;
      }
      localStorage.setItem('auth_token', data.token);
      navigate('/');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f6f7' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 40, width: 360, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#1a1d23' }}>Iniciar sesión</h1>
        {error && (
          <div style={{ background: '#fff4f4', border: '1px solid #fcc', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: '#c0392b', fontSize: 13 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #c4cdd5', marginBottom: 16, fontSize: 14, background: '#fff', color: '#1a1d23', boxSizing: 'border-box' }}
          />
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Contraseña</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #c4cdd5', marginBottom: 24, fontSize: 14, background: '#fff', color: '#1a1d23', boxSizing: 'border-box' }}
          />
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', background: '#5c6ac4', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 3.3 Agregar ruta `/login` y proteger rutas en `web/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
// ... otras importaciones

function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('auth_token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="/orders/new" element={<PrivateRoute><NewOrder /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Parte 4 — Variables de entorno adicionales

Agregar a `app/.env`:

```dotenv
# Shopline
SHOPLINE_APP_KEY=<nuevo_app_key>
SHOPLINE_APP_SECRET=<nuevo_app_secret>
HOST=https://tu-app.com
SCOPES=write_products,read_products,write_orders,read_orders,read_customers,write_customers
SHOPLINE_ACCESS_TOKEN=<token_obtenido_en_setup>  # ← nuevo
SHOPLINE_SHOP_HANDLE=test-lab-arkus-v2           # ← nuevo

# Auth propio
JWT_SECRET=<cadena_aleatoria_min_32_chars>       # ← nuevo
ADMIN_EMAIL=admin@tudominio.com                  # ← nuevo
ADMIN_PASSWORD_HASH=<bcrypt_hash>                # ← nuevo
```

Para generar el hash de la contraseña:
```bash
node -e "const b=require('bcryptjs'); b.hash('tu_contraseña',10).then(h=>console.log(h))"
```

Para generar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Parte 5 — Lo que deja de funcionar

Al cambiar a standalone, los siguientes elementos **dejan de funcionar**:

| Funcionalidad | Estado | Alternativa |
|---|---|---|
| `Redirect.create(app).ToAdminPage(...)` | Roto | Enlace manual a `https://tienda.myshopline.com/admin/...` |
| `ResourcePicker` | Roto | Ya removido en `main` |
| `shared.getSessionToken` | Roto | Token propio del localStorage |
| Notificaciones nativas de Shopline | No disponibles | Toasts propios (ya implementados) |
| Aparece en el menú de Apps del Admin | No | Acceso por URL directa |

---

## Flujo completo resultante

```
Usuario accede a https://tu-app.com
    ↓
¿Tiene auth_token en localStorage?
    ├── SÍ → Carga la app directamente
    └── NO → Redirige a /login
                ↓
           Formulario email/password
                ↓
           POST /api/login → JWT propio (8h)
                ↓
           localStorage.setItem('auth_token', jwt)
                ↓
           Redirect a /
                ↓
           Todas las llamadas API usan Authorization: Bearer {jwt}
                ↓
           Backend valida jwt → obtiene SHOPLINE_ACCESS_TOKEN de .env
                ↓
           Llama a Shopline REST API
```
