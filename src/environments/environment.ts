/**
 * Configuración de producción. En development se reemplaza por
 * `environment.development.ts` (fileReplacements en angular.json).
 */
export const environment = {
  /**
   * Base de la API. `/api` sirve si la SPA se publica detrás del mismo host que la API;
   * si la API vive en otro dominio, poner acá la URL completa y habilitar CORS en la API
   * (ver docs/runbook-spa-social-login.md §3.3).
   */
  apiBaseUrl: '/api',
  /**
   * ClientId de la app OAuth de Google (Web application). DEBE ser exactamente el mismo
   * que la API tiene en `ExternalAuth:Providers:google:ClientId`; si difieren, el
   * `POST /auth/external` devuelve 401 (la API valida el `aud` del ID token).
   */
  googleClientId: '448134429780-fa19l1avvq9ro3trmd758acl54s4j4n7.apps.googleusercontent.com',
};
