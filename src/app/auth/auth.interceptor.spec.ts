import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let token: string | null;
  let refresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    token = null;
    refresh = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { accessToken: () => token, refresh } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => http.verify());

  /** Los reintentos post-refresh se encadenan tras un microtask del Promise. */
  const settle = () => new Promise(resolve => setTimeout(resolve));

  it('adds the Bearer and audit headers to API requests', () => {
    token = 'tok-1';
    client.get('/api/v1/sucursales').subscribe();

    const req = http.expectOne('/api/v1/sucursales');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-1');
    expect(req.request.headers.get('X-Application')).toBe('sucursales-dashboard');
    expect(req.request.headers.get('X-Channel')).toBe('web');
    expect(req.request.headers.get('X-Correlation-ID')).toBeTruthy();
    req.flush([]);
  });

  it('omits the Bearer on /auth/ endpoints but keeps the audit headers', () => {
    token = 'tok-1';
    client.post('/api/v1/auth/refresh', {}).subscribe();

    const req = http.expectOne('/api/v1/auth/refresh');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.get('X-Application')).toBe('sucursales-dashboard');
    req.flush({});
  });

  it('sends no Authorization while logged out', () => {
    client.get('/api/v1/provincias').subscribe();

    const req = http.expectOne('/api/v1/provincias');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('leaves non-API requests (assets CSVs) untouched', () => {
    token = 'tok-1';
    client.get('assets/data/sucursales.csv', { responseType: 'text' }).subscribe();

    const req = http.expectOne('assets/data/sucursales.csv');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-Application')).toBe(false);
    req.flush('');
  });

  it('on a 401 refreshes once and retries the request with the new token', async () => {
    token = 'viejo';
    refresh.mockImplementation(async () => { token = 'nuevo'; return true; });

    let body: unknown;
    client.get('/api/v1/sucursales').subscribe(r => (body = r));

    http.expectOne('/api/v1/sucursales').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();

    const retry = http.expectOne('/api/v1/sucursales');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer nuevo');
    retry.flush([{ id: 'S1' }]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(body).toEqual([{ id: 'S1' }]);
  });

  it('when the refresh fails it propagates the 401 and redirects to /login', async () => {
    token = 'vencido';
    refresh.mockResolvedValue(false);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    let status: number | undefined;
    client.get('/api/v1/sucursales').subscribe({ error: err => (status = err.status) });

    http.expectOne('/api/v1/sucursales').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();

    expect(status).toBe(401);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('does not refresh on non-401 errors', async () => {
    token = 'tok-1';
    let status: number | undefined;
    client.get('/api/v1/sucursales').subscribe({ error: err => (status = err.status) });

    http.expectOne('/api/v1/sucursales').flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(status).toBe(500);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not refresh when the 401 comes from an /auth/ endpoint', async () => {
    let status: number | undefined;
    client.post('/api/v1/auth/external', {}).subscribe({ error: err => (status = err.status) });

    http.expectOne('/api/v1/auth/external').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();

    expect(status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
  });
});
