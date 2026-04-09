# Shopline App — Diagrama de Interacción

## Ciclo de Vida Completo (Instalación → Uso → Desinstalación)

```mermaid
sequenceDiagram
    actor Merchant
    participant SL as Shopline Admin
    participant AppServer as App Server<br/>(Express)
    participant AppFrontend as App Frontend<br/>(React/Vite)
    participant ShoplineAPI as Shopline API<br/>(REST / GraphQL)
    participant WebhookHub as Shopline Webhook Hub

    rect rgb(230, 245, 255)
        Note over Merchant,ShoplineAPI: FASE 1 — INSTALACIÓN Y OAUTH
        Merchant->>SL: Instala la app (App Market o URL directa)
        SL->>AppServer: GET /api/auth?handle={store}&hmac=...
        AppServer->>SL: 302 → OAuth Authorization URL<br/>(appKey + scopes)
        SL->>Merchant: Muestra pantalla de permisos
        Merchant->>SL: Aprueba permisos
        SL->>AppServer: GET /api/auth/callback?code=...&hmac=...
        AppServer->>ShoplineAPI: POST /admin/oauth/access_token<br/>{code, appKey, appSecret}
        ShoplineAPI-->>AppServer: { access_token, scope }
        AppServer->>AppServer: Persiste sesión en SQLite<br/>(handle + accessToken)
        AppServer->>WebhookHub: Registra webhooks<br/>(apps/installed_uninstalled, etc.)
        WebhookHub-->>AppServer: 200 OK
        AppServer->>SL: 302 → App embedded URL
    end

    rect rgb(240, 255, 240)
        Note over Merchant,ShoplineAPI: FASE 2 — USO NORMAL (EMBEDDED)
        Merchant->>SL: Abre la app en el Admin
        SL->>AppFrontend: Carga iframe con ?appKey=...&host=...&lang=...
        AppFrontend->>AppFrontend: useAppBridge() inicializa cliente
        AppFrontend->>AppServer: GET / (proxy Vite → Express)
        AppServer->>AppServer: Verifica sesión válida (SQLite)
        AppServer-->>AppFrontend: 200 OK

        Note over AppFrontend,ShoplineAPI: Acción de usuario (ej. Crear Producto)
        Merchant->>AppFrontend: Click "Create Product"
        AppFrontend->>AppFrontend: getSessionToken(app) → JWT
        AppFrontend->>AppServer: POST /api/products/create<br/>Authorization: Bearer {sessionToken}
        AppServer->>AppServer: Verifica JWT + carga accessToken de SQLite
        AppServer->>ShoplineAPI: POST /admin/openapi/v20230901/products<br/>Authorization: Bearer {accessToken}
        ShoplineAPI-->>AppServer: { product: {...} }
        AppServer-->>AppFrontend: 200 { data: {...} }
        AppFrontend->>Merchant: Muestra "create product success"
    end

    rect rgb(255, 245, 230)
        Note over WebhookHub,AppServer: FASE 3 — EVENTOS WEBHOOK
        ShoplineAPI->>WebhookHub: Evento disparado (ej. products/create)
        WebhookHub->>AppServer: POST /api/webhooks<br/>X-Shopline-Topic: products/create<br/>X-Shopline-Hmac-Sha256: {hmac}
        AppServer->>AppServer: Verifica HMAC con appSecret
        AppServer->>AppServer: Ejecuta lógica de negocio
        AppServer-->>WebhookHub: 200 OK + X-Trace-Id
    end

    rect rgb(255, 235, 235)
        Note over Merchant,AppServer: FASE 4 — DESINSTALACIÓN
        Merchant->>SL: Desinstala la app
        SL->>WebhookHub: Dispara apps/installed_uninstalled (action: uninstalled)
        WebhookHub->>AppServer: POST /api/webhooks<br/>X-Shopline-Topic: apps/installed_uninstalled
        AppServer->>AppServer: Elimina sesión del merchant de SQLite
        AppServer-->>WebhookHub: 200 OK
    end
```

---

## Diagrama de Componentes (Arquitectura del Template)

```mermaid
graph TB
    subgraph "Shopline Platform"
        ADMIN[Admin UI]
        OAUTH[OAuth 2.0 Service]
        RESTAPI["Admin REST API<br/>v20230901+"]
        WHHUB[Webhook Hub]
    end

    subgraph "App (Monorepo)"
        subgraph "web/ — Frontend (React + Vite)"
            APPBRIDGE["useAppBridge<br/>@shoplinedev/appbridge"]
            AUTHFETCH[useAuthenticatedFetch]
            PAGES[Pages / Router]
        end
        subgraph "app/ — Backend (Express + TS)"
            AUTHROUTE["/api/auth + /callback"]
            WEBHOOKROUTE[/api/webhooks]
            PRODUCTROUTE[/api/products/create]
            SQLITE[("SQLite<br/>Sessions")]
            SHOPLINESD["@shoplineos/shopline-app-express"]
        end
    end

    ADMIN -->|iframe embed| APPBRIDGE
    APPBRIDGE --> AUTHFETCH
    PAGES --> AUTHFETCH
    AUTHFETCH -->|"Bearer sessionToken"| PRODUCTROUTE
    AUTHROUTE --> SHOPLINESD
    SHOPLINESD --> OAUTH
    OAUTH -->|access_token| SHOPLINESD
    SHOPLINESD --> SQLITE
    PRODUCTROUTE -->|"Bearer access_token"| RESTAPI
    WHHUB -->|"POST HMAC-verified"| WEBHOOKROUTE
    WEBHOOKROUTE --> SQLITE
```

---

## Notas sobre el Flujo de Tokens

| Token | Quién lo emite | Quién lo consume | Vida útil |
|---|---|---|---|
| **OAuth `code`** | Shopline OAuth Service | Backend `/api/auth/callback` | Un solo uso |
| **`access_token`** | Shopline OAuth Service | Backend → Admin REST API | Largo plazo (persiste en SQLite) |
| **Session JWT** | `@shoplinedev/appbridge` (cliente) | Backend como Bearer header | Corto plazo (~1 min); se renueva automáticamente |
