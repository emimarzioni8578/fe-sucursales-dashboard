import { AfterViewInit, Component, ElementRef, output, viewChild } from '@angular/core';
import { environment } from '@env/environment';
import { loadGsi } from './gsi-loader';

/** API mínima de Google Identity Services que usa el botón (script cargado por gsi-loader). */
declare const google: {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (resp: { credential: string }) => void }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

/**
 * Renderiza el botón "Continuar con Google" (GIS) y emite el ID token (`credential`)
 * cuando el usuario completa el popup. Quién lo POSTea a /auth/external es el padre.
 */
@Component({
  selector: 'app-google-button',
  standalone: true,
  template: `<div #container></div>`,
})
export class GoogleButtonComponent implements AfterViewInit {
  /** ID token (JWT RS256 de Google) listo para mandar a POST /auth/external. */
  readonly idToken = output<string>();
  /** Falla al cargar/inicializar GIS (sin red, script bloqueado, etc.). */
  readonly loadError = output<string>();
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');

  async ngAfterViewInit(): Promise<void> {
    try {
      await loadGsi();
      // App zoneless: el callback de GIS llega fuera de Angular, pero el padre reacciona
      // vía signals, así que no hace falta NgZone.
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (resp: { credential: string }) => this.idToken.emit(resp.credential),
      });
      google.accounts.id.renderButton(this.container().nativeElement,
        { theme: 'outline', size: 'large', text: 'continue_with', width: 280 });
    } catch (err) {
      this.loadError.emit(err instanceof Error ? err.message : 'No se pudo inicializar Google Sign-In');
    }
  }
}
