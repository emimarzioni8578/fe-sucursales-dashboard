import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@auth/auth.service';
import { GoogleButtonComponent } from '@auth/google-button';
import { MicrosoftLoginService } from '@auth/microsoft-login';

type Provider = 'google' | 'microsoft';

/**
 * Pantalla de login social: cada botón entrega el ID token de su proveedor y acá se lo
 * canjea contra `POST /auth/external` por el par access+refresh propio de la API.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, GoogleButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly microsoft = inject(MicrosoftLoginService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Fase del login en curso: distingue "esperando al proveedor" de "validando con la API". */
  readonly phase = signal<'idle' | 'proveedor' | 'api'>('idle');
  readonly busy = computed(() => this.phase() !== 'idle');
  readonly error = signal<string | null>(null);

  constructor() {
    // Con sesión vigente no tiene sentido mostrar el login.
    if (this.auth.isLoggedIn()) void this.router.navigateByUrl(this.returnUrl());
  }

  /** El botón de Google (GIS) ya trae el ID token en su callback. */
  onIdToken(idToken: string): Promise<void> {
    return this.signIn('google', async () => idToken);
  }

  /** Con Microsoft el ID token se obtiene recién al abrir el popup de MSAL. */
  loginWithMicrosoft(): Promise<void> {
    return this.signIn('microsoft', () => this.microsoft.acquireIdToken());
  }

  private async signIn(provider: Provider, getIdToken: () => Promise<string>): Promise<void> {
    this.phase.set('proveedor');
    this.error.set(null);
    try {
      const idToken = await getIdToken();
      this.phase.set('api');
      await this.auth.loginExternal(idToken, provider);
      await this.router.navigateByUrl(this.returnUrl());
    } catch (err) {
      // Cerrar el popup de MSAL no es un error a mostrar.
      if (!isUserCancelled(err)) this.error.set(this.describeError(err));
    } finally {
      this.phase.set('idle');
    }
  }

  /** URL a la que volver tras el login (la deja el authGuard); solo rutas internas. */
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url?.startsWith('/') ? url : '/';
  }

  private describeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'La API rechazó el login (401). Verificá que el ClientId del proveedor esté configurado '
          + 'en la API y sea el mismo que usa esta SPA (ver docs/runbook-spa-social-login.md §7).';
      }
      if (err.status === 0) {
        return 'No se pudo contactar a la API. ¿Está corriendo en https://localhost:5001 con el proxy activo?';
      }
      return `Error ${err.status} al iniciar sesión: ${err.statusText || 'fallo de red'}.`;
    }
    return err instanceof Error ? err.message : 'Ocurrió un error inesperado al iniciar sesión.';
  }
}

/** BrowserAuthError de MSAL cuando el usuario cierra el popup sin completar el login. */
function isUserCancelled(err: unknown): boolean {
  return typeof err === 'object' && err !== null
    && (err as { errorCode?: string }).errorCode === 'user_cancelled';
}
