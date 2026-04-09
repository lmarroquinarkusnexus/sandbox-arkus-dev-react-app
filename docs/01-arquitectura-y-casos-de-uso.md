# Shopline Developer Platform — Arquitectura y Casos de Uso

## Propósito Principal

Shopline es una plataforma de comercio electrónico SaaS que expone un ecosistema
de desarrollo para extender la funcionalidad de las tiendas de sus merchants.
Los desarrolladores interactúan con ella a través de:

- **Admin REST API / GraphQL API** — operaciones CRUD sobre recursos del merchant
  (productos, pedidos, clientes, inventario, etc.)
- **Storefront API / Ajax API** — integraciones del lado del storefront (carrito,
  colecciones, búsqueda)
- **Webhooks** — notificaciones push de eventos del merchant en tiempo real
- **AppBridge SDK** (`@shoplinedev/appbridge`) — embeber la app dentro del Admin
  de Shopline via iframe con autenticación sin fricción
- **Extensiones** — componentes UI que se inyectan en puntos específicos del Admin
  o del storefront

---

## Tipos de Aplicaciones

| Tipo | Distribución | Aprobación | Caso de uso típico |
|---|---|---|---|
| **Public App** | Shopline App Market | Sí (1-2 días hábiles) | SaaS para múltiples merchants |
| **Custom App** | Instalación directa (URL) | No | Agencias, soluciones a medida multi-merchant |
| **Private App** | Un solo merchant | No | Automatizaciones internas, integraciones propietarias |

---

## Categorías Funcionales de Apps

| Categoría | Descripción |
|---|---|
| **Embedded Admin App** | Corre dentro del Admin del merchant como iframe; usa AppBridge para navegar, obtener tokens y comunicarse con el host |
| **Storefront Widget / Extension** | Inyecta UI en el storefront (banners, pop-ups, configuradores de producto) |
| **Integration / Connector** | Sincroniza datos entre Shopline y sistemas externos (ERP, WMS, PIM, CRM) vía REST/GraphQL + Webhooks |
| **Automation / Workflow** | Escucha eventos webhook para disparar lógica de negocio (fulfillment automático, descuentos, alertas) |
| **Theme App Extension** | Bloques de Handlebars/Liquid que los merchants arrastran dentro del Theme Editor |
| **Payment App** | Integración con pasarelas de pago; requiere revisión extendida (3-5 días) |

---

## APIs Disponibles

| API | Protocolo | Versión actual | Notas |
|---|---|---|---|
| Admin REST API | HTTP/JSON | v20260601 | CRUD completo sobre recursos admin |
| Admin GraphQL API | HTTP/GraphQL | v20260601 | Queries y mutations eficientes |
| Storefront API | HTTP/JSON | v20260601 | Pública; expuesta al cliente final |
| Ajax API | HTTP/JSON | — | Operaciones simples de carrito/storefront |
| Webhook | HTTPS POST | — | Eventos push; verificación HMAC |

---

## Stack del Template Oficial (este repo)

```
sandbox-arkus-dev-react-app/
├── shopline.app.toml          ← Manifiesto: appKey, appUrl, scopes, callbacks
├── package.json               ← Workspace root; scripts: dev / build / dev:reset
├── app/                       ← Backend: Express + TypeScript
│   ├── src/shopline.ts        ← Inicializa SDK, OAuth, SQLite sessions
│   ├── src/index.ts           ← Servidor HTTP, rutas /api/auth, /api/webhooks
│   └── src/service/product/   ← Llamadas a Admin REST API
└── web/                       ← Frontend: React 18 + Vite 5
    ├── src/hooks/useAppBridge.ts          ← Instancia AppBridge
    ├── src/hooks/useAuthenticatedFetch.ts ← Fetch con Bearer token
    └── src/pages/index.tsx                ← Página principal embedded
```
