# Autenticación en la SPA (login social)

Qué quedó implementado en **este repo** y cómo operarlo. Complementa a
[authentication-guide.md](authentication-guide.md) (contrato de los endpoints de auth de la API) y
[runbook-spa-social-login.md](runbook-spa-social-login.md) (diseño paso a paso y registro de las
apps OAuth): esos dos son la referencia; este documento es el estado real del código.

## En una frase

Todo el dashboard está protegido por un guard: sin sesión te lleva a `/login`, donde el usuario
entra con **Google** (Google Identity Services) o **Microsoft** (MSAL). La SPA obtiene el **ID
token** del proveedor, lo canjea en `POST /api/v1/auth/external` por el par **access + refresh
propio de la API**, y a partir de ahí cada request a la API viaja con `Authorization: Bearer`.

> Consecuencia operativa: para pasar del login **hace falta la API corriendo**
> (`https://localhost:5001`) con los ClientIds configurados, aunque los datos del dashboard
> sigan viniendo de los CSVs locales.

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| [`auth/auth.service.ts`](../src/app/auth/auth.service.ts) | La sesión. `loginExternal(idToken, provider)` → POST `/auth/external`; guarda el `AuthResult` en un signal + `sessionStorage`; `refresh()` con rotación **single-flight** (un solo refresh en vuelo: el token es de un uso); `logout()`. |
| [`auth/auth.interceptor.ts`](../src/app/auth/auth.interceptor.ts) | Decora **solo** los requests cuya URL empieza con `environment.apiBaseUrl`: Bearer + headers de auditoría (`X-Application`, `X-Channel`, `X-Correlation-ID`). Ante un 401 hace **un** refresh y reintenta; si el refresh falla, limpia la sesión y redirige a `/login`. Los CSVs de `assets/` pasan sin tocar. |
| [`auth/auth.guard.ts`](../src/app/auth/auth.guard.ts) | `canActivateChild` sobre el grupo de rutas del dashboard. Sin sesión → `/login?returnUrl=<destino>` (con filtros incluidos en la URL). |
| [`auth/gsi-loader.ts`](../src/app/auth/gsi-loader.ts) | Inyecta el script de Google Identity Services una sola vez (promesa cacheada a nivel módulo). |
| [`auth/google-button.ts`](../src/app/auth/google-button.ts) | Renderiza el botón de GIS y emite el `credential` (que **es** el ID token) por el output `idToken`. |
| [`auth/microsoft-login.ts`](../src/app/auth/microsoft-login.ts) | `MicrosoftLoginService.acquireIdToken()`: popup de MSAL (authority `/common`, multi-tenant) y devuelve `result.idToken`. `@azure/msal-browser` se importa **on-demand** → chunk lazy propio que solo se baja al clickear el botón. |
| [`pages/login/`](../src/app/pages/login/) | La pantalla: ambos botones comparten un `signIn(provider, getIdToken)` común (busy, manejo de errores, `returnUrl`). |
| [`environments/`](../src/environments/) | `apiBaseUrl` + los dos ClientIds. `environment.development.ts` reemplaza al de prod vía `fileReplacements`. |
| [`proxy.conf.json`](../proxy.conf.json) | En dev, `/api` → `https://localhost:5001` (evita CORS; cableado en `angular.json` → serve). |
| [`app.ts`](../src/app/app.ts) / [`app.html`](../src/app/app.html) | El shell oculta toolbar y filter-bar en `/login` (`isLoginPage`) y muestra el botón **cerrar sesión** cuando hay login activo. |

## Ciclo de la sesión

```
/cualquier-ruta ──authGuard──▶ sin sesión ──▶ /login?returnUrl=...
                                                 │ click Google (GIS) ó Microsoft (MSAL popup)
                                                 ▼
                              ID token del proveedor (JWT RS256)
                                                 │ POST /api/v1/auth/external { idToken, provider }
                                                 ▼
                        AuthResult { accessToken, refreshToken, ... } de la API
                                                 │ signal + sessionStorage
                                                 ▼
                 requests a /api/* con Bearer (interceptor) ──▶ 401 ──▶ refresh ──▶ retry
                                                                        │ falla
                                                                        ▼
                                                              logout + /login
```

- **Persistencia**: `sessionStorage` — sobrevive al F5, no a cerrar la pestaña. Cualquier storage
  del browser es legible por XSS: mantener la CSP estricta y las dependencias al día.
- **Refresh con rotación**: cada `POST /auth/refresh` revoca el token usado y emite uno nuevo;
  por eso el `AuthService` deduplica refreshes concurrentes (un segundo intento con el mismo
  token daría 401).
- **`returnUrl`**: el guard lo deja en la query y el login navega ahí tras autenticar; solo se
  aceptan rutas internas (una URL externa cae a `/`).
- **Popup de Microsoft cerrado** (`user_cancelled` de MSAL): no se muestra como error.

## Configuración

### SPA — `src/environments/`

| Clave | Dev | Prod |
|-------|-----|------|
| `apiBaseUrl` | `/api` (pega al proxy) | `/api` si comparte host con la API; URL completa + CORS si no ([runbook §3.3](runbook-spa-social-login.md)) |
| `googleClientId` | `448134429780-fa19l1avvq9ro3trmd758acl54s4j4n7.apps.googleusercontent.com` | ídem |
| `microsoftClientId` | `d49e6ae9-330c-4d9f-8f0d-752dde68707a` | ídem |

**Regla de oro**: cada ClientId debe ser **exactamente el mismo** que la API tiene en
`ExternalAuth:Providers:<provider>:ClientId` — la API valida que el `aud` del ID token sea ese
ClientId; si difieren, `/auth/external` devuelve 401. Los ClientId son identificadores públicos,
no secretos: está bien que vivan comiteados en los environments.

### API (repo del backend)

```powershell
cd src/Web
dotnet user-secrets set "ExternalAuth:Providers:google:ClientId"    "448134429780-fa19l1avvq9ro3trmd758acl54s4j4n7.apps.googleusercontent.com"
dotnet user-secrets set "ExternalAuth:Providers:microsoft:ClientId" "d49e6ae9-330c-4d9f-8f0d-752dde68707a"
```

(En Azure: `azd env set EXTERNAL_AUTH_GOOGLE_CLIENT_ID` / `EXTERNAL_AUTH_MICROSOFT_CLIENT_ID` +
`azd provision`; ver [runbook §3.2](runbook-spa-social-login.md).)

### Registro en los proveedores

- **Google** ([runbook §2.1](runbook-spa-social-login.md)): OAuth client tipo *Web application*
  con `http://localhost:4200` en **Authorized JavaScript origins** (GIS no usa redirect URI).
- **Microsoft** ([runbook §2.2](runbook-spa-social-login.md)): App registration **multi-tenant**
  (alineado con el authority `/common` que usa `microsoft-login.ts` y la API), plataforma
  **Single-page application** con redirect URI `http://localhost:4200`. Si el registro fuera
  single-tenant, cambiar el authority en **ambos** lados al tenant específico.

## Correr y probar end-to-end

1. API arriba con los user secrets cargados: `dotnet run --project src/Web`.
2. `npm start` → `http://localhost:4200` → el guard redirige a `/login`.
3. Entrar con Google o Microsoft. En **Network**: `POST /api/v1/auth/external` → `200` con
   `{ accessToken, refreshToken, tokenType: "Bearer" }`.
4. Navegar el dashboard: la sesión sobrevive al F5; **cerrar sesión** (toolbar) vuelve a `/login`.
5. Refresh con rotación: borrar solo el `accessToken` del `sessionStorage` y disparar un request
   a la API → el interceptor hace `POST /auth/refresh` y reintenta.

## Troubleshooting rápido

| Síntoma | Causa probable |
|---------|----------------|
| 401 en `/auth/external` (la UI sugiere revisar el ClientId) | Falta el user secret en la API, o el ClientId de la API ≠ el del environment |
| "No se pudo contactar a la API" (status 0) | API caída o proxy apuntando mal (`proxy.conf.json`) |
| El botón de Google no aparece / `origin_mismatch` | `http://localhost:4200` no está en los JavaScript origins (o no propagó aún) |
| Popup de Microsoft bloqueado | Popup blocker: el login debe salir de un click directo |
| 401 con `IDX10214` en el log de la API | Se mandó el access token de MS en vez del **ID token**, o ClientId desalineado |

La tabla completa está en [runbook §7](runbook-spa-social-login.md).

## Testing

Specs junto a cada unidad (`npx ng test --watch=false`):

- `auth.service.spec.ts` — contrato del POST, restore por `sessionStorage`, rotación y
  deduplicación del refresh, logout.
- `auth.interceptor.spec.ts` — Bearer/headers solo a la API, passthrough de assets,
  401 → refresh → retry, redirección al fallar el refresh.
- `auth.guard.spec.ts` — acceso con sesión y redirect con `returnUrl`.
- `login.spec.ts` — ambos proveedores, sanitización del `returnUrl`, mensajes de error,
  popup cancelado silencioso.
- `google-button.spec.ts` / `gsi-loader.spec.ts` — inicialización de GIS y carga del script.
  *Gotcha*: el loader cachea la promesa a nivel módulo, por eso el happy path y el camino de
  error viven en archivos de spec separados (el registro de módulos es por archivo).
- En `app.spec.ts` — `isLoginPage`, shell oculto en `/login`, visibilidad del botón de logout.

## Decisiones de implementación

- **Zoneless**: a diferencia del runbook, no se usa `NgZone` — los callbacks de GIS/MSAL llegan
  fuera de Angular pero el estado vive en signals, que ya disparan la detección de cambios.
- **MSAL on-demand**: `import('@azure/msal-browser')` dentro de `acquireIdToken()` mantiene a la
  librería fuera del chunk del login (solo la descarga quien usa Microsoft).
- **El interceptor no toca los assets**: la condición `startsWith(environment.apiBaseUrl)` deja
  pasar intactos los CSVs que hoy alimentan el dashboard.
- **Peer alignment**: `@angular/animations` estaba en `^20` con el resto del stack en 21 y
  rompía cualquier `npm install` (ERESOLVE); quedó alineado a `^21.2.0`.
