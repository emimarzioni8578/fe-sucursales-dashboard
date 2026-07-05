# Guía de autenticación (cómo probar el backend)

Cómo autenticarse contra la API y llamar a un endpoint protegido. Diseño y detalle en
[auth-jwt-integration-proposal.md](auth-jwt-integration-proposal.md).

## En una frase

La API valida y **emite su propio JWT**. Te logueás en `/auth/login` (o social en `/auth/external`),
recibís un `accessToken`, y lo mandás en `Authorization: Bearer <token>` en cada request a un endpoint
`[Authorize]`.

- **Anónimos** (no requieren token): `POST /api/v1/users` (registro), `POST /api/v1/auth/*`,
  `POST /api/v1/email-verifications` y `.../resend`, y los `/health/*`.
- **Todo lo demás requiere `[Authorize]`** (heredado de `ApiControllerBase`).
- Algunos endpoints sensibles exigen además el email verificado
  (`[Authorize(Policy = "EmailVerified")]`, hoy: alta masiva de sucursales).

Base URL en dev: `https://localhost:5001` (environment `Development`). Una vez, para el certificado:

```powershell
dotnet dev-certs https --trust
```

## Endpoints de auth

| Método | Ruta | Body | Devuelve |
| --- | --- | --- | --- |
| `POST` | `/api/v1/users` | `{ name, lastname, email, password }` | `201` (registro, anónimo) |
| `POST` | `/api/v1/auth/login` | `{ email, password }` | `200` `AuthResult` / `401` |
| `POST` | `/api/v1/auth/external` | `{ idToken, provider }` | `200` `AuthResult` / `401` (login social) |
| `POST` | `/api/v1/auth/refresh` | `{ refreshToken }` | `200` `AuthResult` / `401` (rota el token) |

`AuthResult`:

```json
{
  "accessToken": "eyJ...",
  "accessTokenExpiresAtUtc": "2026-01-01T00:00:00Z",
  "refreshToken": "xTq...",
  "refreshTokenExpiresAtUtc": "2026-01-31T00:00:00Z",
  "tokenType": "Bearer"
}
```

## Paso a paso: consultar sucursales autenticado

**1. Registrar un usuario** (anónimo):

```powershell
$base = "https://localhost:5001"
Invoke-RestMethod -Method Post -Uri "$base/api/v1/users" -ContentType "application/json" `
  -Body '{"name":"Test","lastname":"User","email":"test@local.dev","password":"Password123!"}'
```

**2. Login → obtener el token:**

```powershell
$auth  = Invoke-RestMethod -Method Post -Uri "$base/api/v1/auth/login" -ContentType "application/json" `
  -Body '{"email":"test@local.dev","password":"Password123!"}'
$token = $auth.accessToken
```

**3. Llamar al endpoint protegido con el Bearer:**

```powershell
Invoke-RestMethod -Uri "$base/api/v1/sucursales" -Headers @{ Authorization = "Bearer $token" }
```

→ `200` (o `204` si no hay sucursales). **Sin** el header → `401`.

Equivalente en curl (`-k` acepta el cert self-signed de dev):

```bash
curl -k -X POST https://localhost:5001/api/v1/users -H "Content-Type: application/json" \
  -d '{"name":"Test","lastname":"User","email":"test@local.dev","password":"Password123!"}'

curl -k -X POST https://localhost:5001/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test@local.dev","password":"Password123!"}'      # copiá el accessToken

curl -k https://localhost:5001/api/v1/sucursales -H "Authorization: Bearer <accessToken>"
```

## Desde Swagger UI

Swagger está en `https://localhost:5001/api` y tiene el botón **"Authorize"** (🔒):

1. Ejecutá `POST /api/v1/auth/login` desde Swagger (o `/users` para registrarte primero) y copiá el
   `accessToken` de la respuesta.
2. Clic en **Authorize** (arriba a la derecha) → pegá **sólo el token** (sin `Bearer `) → *Authorize*.
3. A partir de ahí Swagger manda el `Authorization: Bearer` en las requests, y podés probar
   `GET /api/v1/sucursales` y demás endpoints protegidos.

> Los endpoints anónimos (login, registro, verificación) no muestran el candado; los `[Authorize]` sí.

## Cómo un endpoint pasa el `[Authorize]`

La request pasa `[Authorize]` cuando trae un JWT válido en `Authorization: Bearer <token>`:

- **firmado** con la `Jwt:Key` configurada (en dev, la de `appsettings.Development.json`),
- **no vencido** (`exp`; el access dura `Jwt:ExpiryMinutes`, 60 min),
- con **issuer/audience** correctos.

Como el token lo emite **tu propio** `/auth/login`, todo eso ya coincide: no hay que configurar nada
extra para pasar el Authorize, sólo loguearte y mandar el Bearer.

### Dos niveles de exigencia

| Endpoint | Requiere |
| --- | --- |
| `GET /api/v1/sucursales` (y la mayoría) | Sólo estar **autenticado** (`[Authorize]`). Sirve cualquier usuario, verificado o no. |
| `POST /api/v1/sucursales/bulk` (sensible) | Autenticado **y** con email verificado (`[Authorize(Policy="EmailVerified")]`). |

Para los endpoints con policy `EmailVerified` necesitás el claim `email_verified=true`. Se obtiene
verificando el email (`POST /api/v1/email-verifications` con el token del correo) y **volviendo a
loguearte** (el claim es un snapshot del momento del login). Para `GET sucursales` **no** hace falta.

## Refrescar el token

El access token dura poco (60 min). Para renovarlo sin re-loguearte, usás el `refreshToken`:

```powershell
$r = Invoke-RestMethod -Method Post -Uri "$base/api/v1/auth/refresh" -ContentType "application/json" `
  -Body (@{ refreshToken = $auth.refreshToken } | ConvertTo-Json)
$token = $r.accessToken   # y $r.refreshToken es uno NUEVO (el anterior queda revocado)
```

El refresh es de **un solo uso** (rotación): cada `refresh` revoca el token usado y emite uno nuevo.
Reusar el viejo → `401`.

## Login social (Google/Microsoft)

`POST /api/v1/auth/external` con `{ idToken, provider }` (el `idToken` lo obtiene el front del
proveedor). El back lo valida contra el JWKS del proveedor, hace find-or-create del usuario (queda
verificado) y devuelve el `AuthResult` propio. Para integrar una SPA de punta a punta (registro de
la app OAuth, botones de Google/MSAL, interceptor, proxy/CORS) ver
[runbook-spa-social-login.md](runbook-spa-social-login.md).

> Requiere configurar `ExternalAuth:Providers:<google|microsoft>:ClientId`. Sin ClientId, el
> endpoint devuelve `401`. Cómo setearlo por ambiente:
>
> - **Dev**: user secrets (no se comitea):
>   `dotnet user-secrets set "ExternalAuth:Providers:google:ClientId" "<id>"` (desde `src/Web`).
>   Alternativa: variable de entorno `ExternalAuth__Providers__google__ClientId`.
> - **Azure (azd)**: `azd env set EXTERNAL_AUTH_GOOGLE_CLIENT_ID <id>` (ídem
>   `EXTERNAL_AUTH_MICROSOFT_CLIENT_ID`) antes de `azd provision`; el bicep lo publica como app
>   setting del App Service. Los ClientId son identificadores públicos, no secretos.
>
> **Issuer multi-tenant (Microsoft)**: con authority `/common/v2.0` el discovery publica el issuer
> con el placeholder literal `{tenantid}`; el validador lo expande con el claim `tid` del token
> (exigiendo formato GUID) antes de comparar — sin eso, todo token Microsoft real daría `401`.
> Si la app debe aceptar **un solo tenant**, apuntá el authority a ese tenant
> (`https://login.microsoftonline.com/<tenant-id>/v2.0`) y la comparación vuelve a ser exacta.
>
> `RequireHttpsMetadata` (por proveedor, default `true`) debe quedar en `true` en prod: obliga a
> bajar el discovery/JWKS del proveedor por HTTPS. Sólo se relaja a `false` para un proveedor OIDC
> falso **local en tests**. La validación criptográfica del ID token (firma, issuer —incluido el
> templateado—, audience, expiración) está cubierta por `ExternalIdTokenValidatorE2ETests`, que
> levanta ese OIDC falso con WireMock y firma tokens RS256 reales.

## Troubleshooting

- **401 Unauthorized** → falta el header `Authorization: Bearer`, el token venció, o está mal firmado
  (¿misma `Jwt:Key` que emitió el token?).
- **403 Forbidden** → estás autenticado pero el endpoint exige `EmailVerified` y tu usuario no lo está.
- **Error de certificado** → corré `dotnet dev-certs https --trust`, o usá `curl -k`.
- **401 en login** → credenciales inválidas (mensaje genérico a propósito, no revela si el email existe).

## Config relacionada

- `Jwt:Key` — clave de firma (HS256). En dev está en `appsettings.Development.json`; en Azure la
  provisiona el bicep como secreto `Jwt--Key` en Key Vault (generado con `secretOrRandomPassword`
  y estable entre provisions). Para usar una clave propia (recomendado ≥ 32 chars):
  `az keyvault secret set --vault-name <kv> --name Jwt--Key --value <clave>` y reiniciar la app.
- `Jwt:ExpiryMinutes` (60), `Jwt:RefreshTokenLifetimeDays` (30).
- `ExternalAuth:Providers:*` — `Authority` + `ClientId` por proveedor (ver "Login social" para el
  seteo por ambiente) + `RequireHttpsMetadata` (default `true`; mantener en prod, sólo `false`
  para OIDC falso en tests).
