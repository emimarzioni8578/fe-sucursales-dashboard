import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@auth/auth.service';
import { GoogleButtonComponent } from '@auth/google-button';

/**
 * Pantalla de login social: el botón de Google entrega el ID token y acá se lo
 * canjea contra `POST /auth/external` por el par access+refresh propio de la API.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, GoogleButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    // Con sesión vigente no tiene sentido mostrar el login.
    if (this.auth.isLoggedIn()) void this.router.navigateByUrl(this.returnUrl());
  }

  async onIdToken(idToken: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.loginExternal(idToken, 'google');
      await this.router.navigateByUrl(this.returnUrl());
    } catch (err) {
      this.error.set(this.describeError(err));
    } finally {
      this.busy.set(false);
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
        return 'La API rechazó el login (401). Verificá que el ClientId de Google esté configurado '
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
