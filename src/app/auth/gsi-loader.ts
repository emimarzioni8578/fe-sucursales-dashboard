let gsi: Promise<void> | null = null;

/** Carga el script de Google Identity Services una sola vez. */
export function loadGsi(): Promise<void> {
  gsi ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(s);
  });
  return gsi;
}
