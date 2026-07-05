/** Configuración de desarrollo (`ng serve`). */
export const environment = {
  /** En dev pega contra el proxy del dev-server (proxy.conf.json → https://localhost:5001). */
  apiBaseUrl: '/api',
  /** Mismo ClientId que la API en dev (user secrets `ExternalAuth:Providers:google:ClientId`). */
  googleClientId: '448134429780-fa19l1avvq9ro3trmd758acl54s4j4n7.apps.googleusercontent.com',
  /** Mismo ClientId que la API en dev (user secrets `ExternalAuth:Providers:microsoft:ClientId`). */
  microsoftClientId: 'd49e6ae9-330c-4d9f-8f0d-752dde68707a',
};
