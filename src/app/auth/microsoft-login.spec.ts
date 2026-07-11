import { TestBed } from '@angular/core/testing';
import { MicrosoftLoginService } from './microsoft-login';
import { environment } from '@env/environment';

// Mockea el import dinámico de @azure/msal-browser: capturamos la config con la que
// se construye el cliente y controlamos initialize/loginPopup sin abrir popups reales.
const msal = vi.hoisted(() => ({
  configs: [] as any[],
  initialize: vi.fn(async () => {}),
  loginPopup: vi.fn(async (_req: unknown) => ({ idToken: 'id-token-123' })),
}));

vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: class {
    constructor(config: unknown) { msal.configs.push(config); }
    initialize = msal.initialize;
    loginPopup = msal.loginPopup;
  },
}));

describe('MicrosoftLoginService', () => {
  let service: MicrosoftLoginService;

  beforeEach(() => {
    msal.configs.length = 0;
    msal.initialize.mockClear();
    msal.loginPopup.mockClear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(MicrosoftLoginService);
  });

  it('devuelve el ID token del popup (no el access token)', async () => {
    await expect(service.acquireIdToken()).resolves.toBe('id-token-123');
    expect(msal.loginPopup).toHaveBeenCalledWith({ scopes: ['openid', 'profile', 'email'] });
  });

  it('configura MSAL con el clientId del environment, la raíz como redirectUri y el timeout del bridge', async () => {
    await service.acquireIdToken();
    expect(msal.configs).toHaveLength(1);
    const config = msal.configs[0];
    expect(config.auth.clientId).toBe(environment.microsoftClientId);
    expect(config.auth.authority).toBe('https://login.microsoftonline.com/common');
    expect(config.auth.redirectUri).toBe(window.location.origin);
    expect(config.system.popupBridgeTimeout).toBe(15000);
  });

  it('inicializa el cliente una sola vez y lo reutiliza en logins posteriores', async () => {
    await service.acquireIdToken();
    await service.acquireIdToken();
    expect(msal.configs).toHaveLength(1);
    expect(msal.initialize).toHaveBeenCalledTimes(1);
    expect(msal.loginPopup).toHaveBeenCalledTimes(2);
  });

  it('propaga el rechazo del popup (p. ej. user_cancelled) sin tragarse el error', async () => {
    msal.loginPopup.mockRejectedValueOnce(Object.assign(new Error('cancelado'), { errorCode: 'user_cancelled' }));
    await expect(service.acquireIdToken()).rejects.toMatchObject({ errorCode: 'user_cancelled' });
  });
});
