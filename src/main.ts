import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import { Chart, registerables } from 'chart.js';

/** ¿La URL trae una respuesta OAuth (code/error + state)? Es el popup de MSAL volviendo. */
function isMsalAuthResponse(): boolean {
  const params = window.location.hash + window.location.search;
  return /(^|[#?&])state=/.test(params) && /(^|[#?&])(code|error)=/.test(params);
}

if (window.location.pathname === '/auth-redirect' || isMsalAuthResponse()) {
  // Popup de MSAL volviendo del proveedor: hay que devolverle la respuesta a la ventana
  // que lo abrió vía BroadcastChannel (contrato de msal-browser v5) y NO bootstrapear la
  // app — el router pisaría la URL con el code antes de poder procesarla.
  import('@azure/msal-browser/redirect-bridge')
    .then(bridge => bridge.broadcastResponseToMainFrame())
    .catch((err) => {
      document.body.textContent = 'No se pudo completar el login de Microsoft. Cerrá esta ventana y reintentá.';
      console.error(err);
    });
} else {
  Chart.register(...registerables);

  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
}
