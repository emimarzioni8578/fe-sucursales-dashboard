import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, AuthResult } from './auth.service';

const STORAGE_KEY = 'sucursales.auth';

function makeAuthResult(partial: Partial<AuthResult> = {}): AuthResult {
  return {
    accessToken: 'access-1',
    accessTokenExpiresAtUtc: '2026-01-01T01:00:00Z',
    refreshToken: 'refresh-1',
    refreshTokenExpiresAtUtc: '2026-01-31T00:00:00Z',
    tokenType: 'Bearer',
    ...partial,
  };
}

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function login(service: AuthService, result = makeAuthResult()): Promise<void> {
    const pending = service.loginExternal('id-token-google', 'google');
    http.expectOne('/api/v1/auth/external').flush(result);
    await pending;
  }

  it('starts logged out without a stored session', () => {
    const service = TestBed.inject(AuthService);
    expect(service.isLoggedIn()).toBe(false);
    expect(service.accessToken()).toBeNull();
  });

  it('restores the session from sessionStorage (F5)', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(makeAuthResult({ accessToken: 'stored' })));
    const service = TestBed.inject(AuthService);
    expect(service.isLoggedIn()).toBe(true);
    expect(service.accessToken()).toBe('stored');
  });

  it('loginExternal POSTs { idToken, provider } to /auth/external and stores the pair', async () => {
    const service = TestBed.inject(AuthService);
    const pending = service.loginExternal('id-token-google', 'google');

    const req = http.expectOne('/api/v1/auth/external');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idToken: 'id-token-google', provider: 'google' });
    req.flush(makeAuthResult());
    await pending;

    expect(service.isLoggedIn()).toBe(true);
    expect(service.accessToken()).toBe('access-1');
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).refreshToken).toBe('refresh-1');
  });

  it('refresh rotates the pair using the stored refreshToken', async () => {
    const service = TestBed.inject(AuthService);
    await login(service);

    const pending = service.refresh();
    const req = http.expectOne('/api/v1/auth/refresh');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush(makeAuthResult({ accessToken: 'access-2', refreshToken: 'refresh-2' }));

    expect(await pending).toBe(true);
    expect(service.accessToken()).toBe('access-2');
  });

  it('deduplicates concurrent refreshes (the API token is single-use)', async () => {
    const service = TestBed.inject(AuthService);
    await login(service);

    const first = service.refresh();
    const second = service.refresh();
    http.expectOne('/api/v1/auth/refresh').flush(makeAuthResult({ accessToken: 'access-2' }));

    expect(await Promise.all([first, second])).toEqual([true, true]);
  });

  it('a failed refresh logs out and clears the storage', async () => {
    const service = TestBed.inject(AuthService);
    await login(service);

    const pending = service.refresh();
    http.expectOne('/api/v1/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(await pending).toBe(false);
    expect(service.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('refresh without a session resolves false without calling the API', async () => {
    const service = TestBed.inject(AuthService);
    expect(await service.refresh()).toBe(false);
    http.expectNone('/api/v1/auth/refresh');
  });

  it('logout clears the session and the storage', async () => {
    const service = TestBed.inject(AuthService);
    await login(service);

    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
