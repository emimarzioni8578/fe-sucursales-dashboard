import { Injectable } from '@angular/core';
import type { PublicClientApplication } from '@azure/msal-browser';
import { environment } from '@env/environment';

/**
 * Login social con Microsoft vía MSAL (popup), ver runbook §5.5. Devuelve el ID token
 * listo para canjear en `POST /auth/external` con provider 'microsoft'.
 *
 * `@azure/msal-browser` se importa on-demand en el primer uso: así no engorda el chunk
 * del login para quienes entran con Google. El popup debe dispararse desde un click
 * directo del usuario (los popup blockers matan popups diferidos).
 */
@Injectable({ providedIn: 'root' })
export class MicrosoftLoginService {
  private msal: PublicClientApplication | null = null;

  async acquireIdToken(): Promise<string> {
    if (!this.msal) {
      const { PublicClientApplication } = await import('@azure/msal-browser');
      this.msal = new PublicClientApplication({
        auth: {
          clientId: environment.microsoftClientId,
          // Multi-tenant (+ cuentas personales), alineado con el authority /common/v2.0
          // de la API. Si el registro fuera single-tenant, apuntar ambos lados al tenant
          // (ver nota de issuer en docs/authentication-guide.md).
          authority: 'https://login.microsoftonline.com/common',
          redirectUri: window.location.origin,
        },
      });
      await this.msal.initialize();
    }
    const result = await this.msal.loginPopup({ scopes: ['openid', 'profile', 'email'] });
    // Mandar el ID token, NO el access token: la API valida `aud = ClientId` del ID token;
    // el access token de MS tiene otra audience y da 401 (IDX10214).
    return result.idToken;
  }
}
