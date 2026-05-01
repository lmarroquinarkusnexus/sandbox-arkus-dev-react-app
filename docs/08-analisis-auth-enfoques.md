# Análisis Técnico: Autenticación en Apps de Shopline

## ¿Por qué la app actual redirige a Shopline para hacer login?

La app fue generada como una **embedded app** de Shopline. Esto significa que corre dentro de un `<iframe>` dentro del Admin de Shopline (`{tienda}.myshopline.com/admin`). Esta arquitectura **impone obligatoriamente** el uso de OAuth 2.0 con redirección a Shopline.

### Los dos tokens del sistema actual

```
┌─────────────────────────────────────────────────────────────────┐
│  TOKEN 1: OAuth Access Token (long-lived)                        │
│  - Emitido por: Shopline OAuth Service                           │
│  - Cuándo: Durante /api/auth/callback (instalación de la app)    │
│  - Guardado en: app/database.sqlite                              │
│  - Usado por: Backend para llamar a la REST API de Shopline      │
│  - Vida útil: Indefinida (hasta que el merchant desinstale)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  TOKEN 2: AppBridge Session JWT (short-lived)                    │
│  - Emitido por: Shopline Admin (vía postMessage al iframe)       │
│  - Cuándo: Cada vez que el frontend llama shared.getSessionToken │
│  - Guardado en: Memoria del browser (nunca persiste)             │
│  - Usado por: Frontend → Authorization: Bearer {jwt} → Backend  │
│  - Vida útil: ~1 minuto (se renueva automáticamente)             │
└─────────────────────────────────────────────────────────────────┘
```

### ¿Qué hace `isEmbeddedApp: true`?

Configurado en `app/src/shopline.ts`:

```typescript
const shopline = shoplineApp({
  isEmbeddedApp: true,   // ← Este flag
  ...
});
```

Con este flag activo:
1. El SDK espera que los requests vengan con un JWT firmado por el Admin de Shopline
2. `validateAuthentication()` rechaza cualquier request sin ese JWT
3. La app **no puede funcionar** fuera del iframe del Admin (no hay quien firme el JWT)
4. Si el JWT expira o el merchant cierra sesión en Shopline, la app deja de funcionar automáticamente

---

## ¿Se puede hacer login sin redirigir a Shopline?

### En modo embedded: NO

La documentación oficial establece que el OAuth 2.0 con redirección es el **único mecanismo de autenticación** para apps embebidas:

- **Documentación oficial de autorización**: https://developer.shopline.com/docs/apps/api-instructions-for-use/app-authorization/
- **Estándares de revisión de apps (App Review Standards)**: https://developer.shopline.com/docs/apps/application-management/shopline-app-review-standards/
- **Guía de inicio para desarrolladores**: https://developer.shopline.com/docs/apps/getting-started/

Cita relevante de los App Review Standards:
> *"Apps must implement OAuth 2.0 identity verification during installation. Apps that bypass the merchant authentication flow or redirect users directly without OAuth verification will be rejected."*

Saltarse el OAuth causaría:
- La app nunca obtendría el Access Token para llamar a la REST API
- El `database.sqlite` quedaría vacío → `validateAuthentication()` siempre fallaría
- La app sería rechazada si se intentara publicar en el App Store de Shopline

---

## Los dos enfoques disponibles

### Enfoque A — Embedded con nueva cuenta (email/password)

**Rama:** `feature/login-embedded`

El flujo OAuth redirect **se mantiene**, pero se apunta a una **nueva cuenta Shopline** creada con email/password en lugar de Gmail. El merchant (tú) ahora se autentica con email/password cuando Shopline pide el login, pero el flujo técnico es idéntico.

```
Usuario abre la app en Shopline Admin
    ↓
Si no hay sesión → redirige a OAuth
    ↓
Página de login de SHOPLINE (email/password, no Gmail)
    ↓
Merchant aprueba permisos
    ↓
App recibe token → guardado en SQLite
    ↓
App funciona normalmente
```

**Ventajas:**
- Sin cambios de arquitectura ni código
- Más seguro que Gmail (password dedicado para la cuenta de desarrollo)
- Compatible con el App Store de Shopline

**Desventajas:**
- El OAuth redirect a Shopline sigue existiendo (no hay login "propio")
- Requiere que el merchant tenga cuenta en Shopline para usar la app

---

### Enfoque B — Standalone con login propio

**Rama:** `feature/login-standalone`

La app se convierte en una **aplicación web independiente** con su propio formulario de login. Deja de vivir en el iframe del Admin de Shopline.

```
Usuario accede a https://tu-app.com/login
    ↓
Formulario de login propio (email/password)
    ↓
Backend valida credenciales → emite JWT propio
    ↓
App carga con sesión propia
    ↓
Llama a Shopline REST API usando token de "service account"
   (obtenido una sola vez durante el setup inicial via OAuth)
```

**Setup inicial (una sola vez):**
1. Correr un script de setup OAuth que guarde el token permanentemente
2. Ese token se usa para todas las llamadas a Shopline API
3. Ya no se necesita que el merchant esté logueado en Shopline

**Ventajas:**
- Login completamente propio (email/password, Google, cualquier proveedor)
- La app funciona fuera del Admin de Shopline
- Posibilidad de tener múltiples usuarios con distintos roles

**Desventajas:**
- **AppBridge deja de funcionar** — ResourcePicker, mensajes nativos de Shopline, redirecciones al Admin se pierden
- `shared.getSessionToken` ya no existe → hay que reemplazar toda la lógica de auth del frontend
- La app ya no es "embedded" → no aparece en el Admin de Shopline automáticamente
- El token de Shopline es de larga duración pero puede expirar — hay que manejar refresh
- NO publicable en el App Store de Shopline bajo las reglas actuales

---

## Comparativa final

| Aspecto | Enfoque A (Embedded) | Enfoque B (Standalone) |
|---|---|---|
| Login propio | ❌ Sigue redirigiendo a Shopline | ✅ Formulario en la app |
| Cambios de código | Solo `.env` y `.toml` | Extensos (auth, frontend, backend) |
| AppBridge | ✅ Funciona | ❌ No disponible |
| Shopline Admin iframe | ✅ Vive dentro del Admin | ❌ App externa |
| Publicable en App Store | ✅ Sí | ❌ No (viola políticas) |
| Múltiples usuarios de la app | ❌ Solo el merchant dueño | ✅ Posible |
| Complejidad de implementación | Baja | Alta |

---

## Recomendación

- **Para seguir con el flujo actual pero con email/password**: usar el Enfoque A en la rama `feature/login-embedded`. Solo cambiar credenciales, crear nueva cuenta Shopline.
- **Para una app web independiente con login propio**: usar el Enfoque B en la rama `feature/login-standalone`. Implica reescribir la capa de autenticación completa.

Ver los documentos `09`, `10` y `11` para instrucciones de implementación de cada enfoque.
