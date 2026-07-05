import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { GoogleButtonComponent } from './google-button';

interface GsiInitConfig { client_id: string; callback: (resp: { credential: string }) => void }

describe('GoogleButtonComponent', () => {
  let initialize: ReturnType<typeof vi.fn>;
  let renderButton: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    initialize = vi.fn();
    renderButton = vi.fn();
    (globalThis as Record<string, unknown>)['google'] = { accounts: { id: { initialize, renderButton } } };
    await TestBed.configureTestingModule({ imports: [GoogleButtonComponent] }).compileComponents();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['google'];
  });

  /** Renderiza el componente y simula la carga exitosa del script de GIS. */
  async function render(): Promise<ComponentFixture<GoogleButtonComponent>> {
    const fixture = TestBed.createComponent(GoogleButtonComponent);
    fixture.detectChanges(); // dispara ngAfterViewInit → loadGsi() inyecta el <script>
    document.head.querySelectorAll<HTMLScriptElement>('script[src*="accounts.google.com/gsi"]')
      .forEach(s => s.dispatchEvent(new Event('load')));
    await new Promise(resolve => setTimeout(resolve)); // deja correr la continuación async
    return fixture;
  }

  it('initializes GIS with the configured ClientId and renders the button in its container', async () => {
    const fixture = await render();

    expect(initialize).toHaveBeenCalledTimes(1);
    const config = initialize.mock.calls[0][0] as GsiInitConfig;
    expect(config.client_id).toBe(environment.googleClientId);

    expect(renderButton).toHaveBeenCalledTimes(1);
    const [parent, options] = renderButton.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    expect((fixture.nativeElement as HTMLElement).contains(parent)).toBe(true);
    expect(options['text']).toBe('continue_with');
  });

  it('emits the GIS credential (the ID token) through the idToken output', async () => {
    const fixture = await render();
    const emitted: string[] = [];
    fixture.componentInstance.idToken.subscribe(t => emitted.push(t));

    const config = initialize.mock.calls[0][0] as GsiInitConfig;
    config.callback({ credential: 'id-token-de-google' });

    expect(emitted).toEqual(['id-token-de-google']);
  });
});
