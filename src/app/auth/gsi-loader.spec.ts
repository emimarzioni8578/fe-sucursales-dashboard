import { loadGsi } from './gsi-loader';

// El happy path (script carga y el botón se inicializa) se cubre en google-button.spec.ts;
// acá se prueba la deduplicación y el rechazo cuando el script no carga. Ambos caminos no
// pueden convivir en un mismo archivo porque el loader cachea la promesa a nivel módulo.
describe('loadGsi', () => {
  it('appends the GIS script once, dedupes callers and rejects when it fails to load', async () => {
    document.head.querySelectorAll('script[src*="accounts.google.com/gsi"]').forEach(s => s.remove());

    const first = loadGsi();
    const second = loadGsi();
    expect(second).toBe(first); // misma promesa: no se inyecta dos veces

    const scripts = document.head.querySelectorAll<HTMLScriptElement>('script[src*="accounts.google.com/gsi"]');
    expect(scripts.length).toBe(1);

    scripts[0].dispatchEvent(new Event('error'));
    await expect(first).rejects.toThrow('No se pudo cargar Google Identity Services');
  });
});
