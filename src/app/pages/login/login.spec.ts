import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '@auth/auth.service';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  async function create(opts: { loggedIn?: boolean; returnUrl?: string } = {}) {
    const auth = {
      isLoggedIn: () => opts.loggedIn ?? false,
      loginExternal: vi.fn<(idToken: string, provider: string) => Promise<void>>().mockResolvedValue(undefined),
    };
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(opts.returnUrl ? { returnUrl: opts.returnUrl } : {}) } },
        },
      ],
    }).compileComponents();

    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginComponent);
    return { fixture, cmp: fixture.componentInstance, auth, navigateByUrl };
  }

  it('creates and stays on the page while logged out', async () => {
    const { cmp, navigateByUrl } = await create();
    expect(cmp).toBeTruthy();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('redirects immediately when a session is already active', async () => {
    const { navigateByUrl } = await create({ loggedIn: true, returnUrl: '/riesgo' });
    expect(navigateByUrl).toHaveBeenCalledWith('/riesgo');
  });

  it('exchanges the Google ID token via loginExternal and navigates to the returnUrl', async () => {
    const { cmp, auth, navigateByUrl } = await create({ returnUrl: '/mapa?provincia=P1' });

    await cmp.onIdToken('id-token-google');

    expect(auth.loginExternal).toHaveBeenCalledWith('id-token-google', 'google');
    expect(navigateByUrl).toHaveBeenCalledWith('/mapa?provincia=P1');
    expect(cmp.busy()).toBe(false);
    expect(cmp.error()).toBeNull();
  });

  it('falls back to / when the returnUrl is not an internal route', async () => {
    const { cmp, navigateByUrl } = await create({ returnUrl: 'https://evil.example' });
    await cmp.onIdToken('tok');
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('a 401 from /auth/external hints at the ClientId mismatch', async () => {
    const { cmp, auth, navigateByUrl } = await create();
    auth.loginExternal.mockRejectedValue(new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    await cmp.onIdToken('tok');

    expect(cmp.error()).toContain('ClientId');
    expect(cmp.busy()).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('status 0 explains that the API is unreachable', async () => {
    const { cmp, auth } = await create();
    auth.loginExternal.mockRejectedValue(new HttpErrorResponse({ status: 0 }));

    await cmp.onIdToken('tok');
    expect(cmp.error()).toContain('No se pudo contactar a la API');
  });

  it('surfaces generic errors (e.g. GIS load failures) as-is', async () => {
    const { cmp, auth } = await create();
    auth.loginExternal.mockRejectedValue(new Error('boom'));

    await cmp.onIdToken('tok');
    expect(cmp.error()).toBe('boom');
  });

  it('renders the error message in the template', async () => {
    const { fixture, cmp } = await create();
    cmp.error.set('La API rechazó el login');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('La API rechazó el login');
  });
});
