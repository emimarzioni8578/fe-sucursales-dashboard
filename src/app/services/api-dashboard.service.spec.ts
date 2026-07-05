import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiDashboardService } from './api-dashboard.service';
import type { DashboardState, FilterOptions } from './dashboard-source';
import type { DashboardData } from '@models/data-models.model';
import { makeDashboardData, makeSucursalRow } from '@testing/mocks';

const OPTIONS: FilterOptions = {
  provincias: [{ id: 'P1', nombre: 'Buenos Aires' }],
  regiones: ['Pampeana'],
  estados: ['Activa'],
};

describe('ApiDashboardService', () => {
  let service: ApiDashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiDashboardService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiDashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Suscribe state$ y flushea la carga de referencia (filters + sucursales) → 'ready'. */
  function becomeReady(states: DashboardState[] = []): DashboardState[] {
    service.state$.subscribe(s => states.push(s));
    http.expectOne('/api/dashboard/filters').flush(OPTIONS);
    http.expectOne('/api/sucursales').flush([
      makeSucursalRow(),
      makeSucursalRow({ id: 'S2', nombre: 'Sucursal Dos', email: 'dos@e.com' }),
    ]);
    return states;
  }

  it('transitions loading → ready once the reference data loads', () => {
    const states = becomeReady();
    expect(states.map(s => s.status)).toEqual(['loading', 'ready']);
  });

  it('exposes an error state when the reference load fails', () => {
    const states: DashboardState[] = [];
    service.state$.subscribe(s => states.push(s));
    // El hermano del forkJoin se completa primero para que no quede abierto en el verify().
    http.expectOne('/api/sucursales').flush([]);
    http.expectOne('/api/dashboard/filters').flush(null, { status: 500, statusText: 'Server Error' });

    const last = states.at(-1)!;
    expect(last.status).toBe('error');
    expect(last.error).toContain('500');
  });

  it('serves the filter options fetched at startup', () => {
    becomeReady();
    let options: FilterOptions | undefined;
    service.filterOptions$.subscribe(o => (options = o));
    expect(options).toEqual(OPTIONS);
  });

  it('requests the aggregated dashboard without params when no filter is active', () => {
    becomeReady();
    let data: DashboardData | undefined;
    service.data$.subscribe(d => (data = d));

    const req = http.expectOne(r => r.url === '/api/dashboard');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(makeDashboardData());
    expect(data?.totalSucursales).toBe(5);
  });

  it('re-queries the backend with the filter as query params (omitting null criteria)', () => {
    becomeReady();
    service.data$.subscribe();
    http.expectOne(r => r.url === '/api/dashboard').flush(makeDashboardData());

    service.setFilter({ provincia: 'P1', desde: '2024-01-01' });

    const req = http.expectOne(r => r.url === '/api/dashboard');
    expect(req.request.params.get('provincia')).toBe('P1');
    expect(req.request.params.get('desde')).toBe('2024-01-01');
    expect(req.request.params.has('region')).toBe(false);
    req.flush(makeDashboardData());
    expect(service.hasActiveFilter).toBe(true);
  });

  it('clearFilter resets the criteria and re-queries', () => {
    becomeReady();
    service.data$.subscribe();
    http.expectOne(r => r.url === '/api/dashboard').flush(makeDashboardData());

    service.setFilter({ region: 'Pampeana' });
    http.expectOne(r => r.url === '/api/dashboard').flush(makeDashboardData());

    service.clearFilter();
    const req = http.expectOne(r => r.url === '/api/dashboard');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(makeDashboardData());
    expect(service.hasActiveFilter).toBe(false);
  });

  it('reload() re-fetches the reference data', () => {
    const states = becomeReady();
    service.reload();
    http.expectOne('/api/dashboard/filters').flush(OPTIONS);
    http.expectOne('/api/sucursales').flush([]);
    expect(states.map(s => s.status)).toEqual(['loading', 'ready', 'loading', 'ready']);
  });

  describe('search & lookup (served from the startup cache)', () => {
    beforeEach(() => becomeReady());

    it('matches by name or email (case-insensitive) and honors the limit', () => {
      expect(service.searchSucursales('DOS').map(r => r.id)).toEqual(['S2']);
      expect(service.searchSucursales('sucursal').length).toBe(2);
      expect(service.searchSucursales('sucursal', 1).length).toBe(1);
    });

    it('returns [] for an empty term', () => {
      expect(service.searchSucursales('   ')).toEqual([]);
    });

    it('getSucursal finds by id and reports missing ones', () => {
      expect(service.getSucursal('S2')?.nombre).toBe('Sucursal Dos');
      expect(service.getSucursal('nope')).toBeUndefined();
    });
  });
});
