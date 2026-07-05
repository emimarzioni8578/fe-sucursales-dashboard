import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';

/** Respuesta de /auth/login, /auth/external y /auth/refresh (AuthResult de la API). */
export interface AuthResult {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  tokenType: string; // "Bearer"
}

const STORAGE_KEY = 'sucursales.auth';

/**
 * Sesión contra la API Sucursales: manda el ID token del proveedor a
 * `POST /auth/external`, guarda el par access+refresh emitido por la API y lo
 * renueva con rotación (ver docs/runbook-spa-social-login.md §5.1).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/v1/auth`;

  private readonly auth = signal<AuthResult | null>(readStored());
  readonly isLoggedIn = computed(() => this.auth() !== null);
  readonly accessToken = computed(() => this.auth()?.accessToken ?? null);

  private refreshInFlight: Promise<boolean> | null = null;

  async loginExternal(idToken: string, provider: 'google' | 'microsoft'): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResult>(`${this.base}/external`, { idToken, provider }));
    this.store(result);
  }

  /** Un solo refresh en vuelo: el refresh de la API es de UN uso (rotación), un segundo
   *  intento concurrente con el mismo token daría 401. */
  refresh(): Promise<boolean> {
    this.refreshInFlight ??= (async () => {
      const current = this.auth();
      if (!current) return false;
      try {
        const result = await firstValueFrom(this.http.post<AuthResult>(
          `${this.base}/refresh`, { refreshToken: current.refreshToken }));
        this.store(result);
        return true;
      } catch {
        this.logout();
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  logout(): void {
    this.auth.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private store(result: AuthResult): void {
    this.auth.set(result);
    // sessionStorage sobrevive al F5 pero no a cerrar la pestaña. Cualquier storage del browser
    // es legible por XSS: mantené la CSP de la SPA estricta y las dependencias al día.
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }
}

function readStored(): AuthResult | null {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null'); } catch { return null; }
}
