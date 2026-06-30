import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CsvDashboardService } from './csv-dashboard.service';
import type { DashboardState } from './dashboard-source';
import type { DashboardData } from '@models/data-models.model';

const FILES = [
  'sucursales', 'provincias', 'localidades', 'distribuidores', 'sucursal_distribuidores',
  'sucursal_social_networks', 'estado_sucursal', 'compensation_requests', 'compensation_request_states',
  'compensation_request_errors', 'errors', 'mails', 'mail_states', 'monitoring', 'monitoring_actions',
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/** Small but representative dataset of 5 branches across 2 provinces. */
function fixtures(): Record<string, string> {
  return {
    provincias: `ProvinciaId,NombreProvincia,Region
P1,Buenos Aires,Pampeana
P2,Cordoba,Centro`,
    localidades: `LocalidadId,ProvinciaId,NombreLocalidad
L1,P1,Ciudad A
L2,P2,Ciudad B`,
    estado_sucursal: `EstadoSucursalId,NombreEstadoSucursal
1,Activa
2,Inactiva
3,Pendiente`,
    sucursales: `SucursalId,NombreSucursal,Direccion,LocalidadId,ProvinciaId,CodigoPostal,EstadoSucursalId,Email,Telefono,FechaApertura,Latitud,Longitud,CreatedAt,UpdatedAt,IsDeleted
S1,Sucursal Uno,Calle 1,L1,P1,1000,1,uno@e.com,111,2024-01-10,-34.6,-58.4,2024-01-10,2024-02-01,0
S2,Sucursal Dos,Calle 2,L1,P1,1000,2,dos@e.com,222,2024-02-10,10,10,2024-02-10,2024-03-01,0
S3,Sucursal Tres,Calle 3,L2,P2,2000,1,tres@e.com,333,2024-03-10,,,2024-03-10,2024-04-01,0
S4,Sucursal Cuatro,Calle 4,L2,P2,2000,3,cuatro@e.com,444,2024-04-10,-31.4,-64.2,2024-04-10,2024-05-01,1
S5,Sucursal Cinco,Calle 5,L1,P1,1000,1,cinco@e.com,555,2024-05-10,-38.0,-60.0,2024-05-10,2024-06-01,0`,
    distribuidores: `DistribuidorId,NombreDistribuidor,IsDeleted
D1,Dist Uno,0`,
    sucursal_distribuidores: `SucursalDistribuidorId,SucursalId,DistribuidorId,EsPrincipal
SD1,S1,D1,1
SD2,S5,D1,0`,
    sucursal_social_networks: `SucursalSocialNetworkId,SucursalId,SocialNetworkId
SSN1,S1,1`,
    compensation_requests: `CompensationRequestId,SucursalId,UserId,CompensationRequestStateId,IsOpen,CreatedAt,ErrorId
C1,S1,U1,1,1,${daysAgo(3)},E1
C2,S1,U1,1,1,${daysAgo(15)},E2
C3,S2,U1,1,1,${daysAgo(60)},E1
C4,S4,U1,3,0,${daysAgo(90)},`,
    compensation_request_states: `CompensationRequestStateId,NombreEstadoCompensacion
1,Pending
2,InReview
3,Approved
4,Rejected`,
    compensation_request_errors: `CompensationRequestErrorId,CompensationRequestId,ErrorId
CE1,C1,E1
CE2,C2,E2`,
    errors: `ErrorId,ErrorName
E1,Timeout
E2,Validation`,
    mails: `MailId,SucursalId,UserId,Subject,MailStateId,RetryCount,CreatedAt
M1,S1,U1,Bienvenida,1,0,${daysAgo(5)}
M2,S1,U1,Bienvenida,2,2,${daysAgo(6)}
M3,S2,U1,Verificacion,2,1,${daysAgo(7)}
M4,S5,U1,Bienvenida,1,0,${daysAgo(8)}`,
    mail_states: `MailStateId,NombreEstadoMail
1,Sent
2,Failed`,
    monitoring: `MonitoringId,UserId,AffectedTable,MonitoringActionId,CreatedAt
MO1,U1,sucursales,1,${daysAgo(2)}
MO2,U1,sucursales,2,${daysAgo(3)}
MO3,U1,mails,1,${daysAgo(4)}`,
    monitoring_actions: `MonitoringActionId,NombreAccion
1,Insert
2,Update
3,SoftDelete
4,BulkInsert
5,BulkUpdate`,
  };
}

function flushAll(http: HttpTestingController, fx = fixtures()): void {
  for (const f of FILES) http.expectOne(`assets/data/${f}.csv`).flush(fx[f]);
}

describe('CsvDashboardService', () => {
  let service: CsvDashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CsvDashboardService],
    });
    service = TestBed.inject(CsvDashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  /** Subscribes to data$, flushes all CSVs and returns a live holder of the latest value. */
  function load(): { readonly current: DashboardData } {
    let latest: DashboardData | undefined;
    service.data$.subscribe(d => (latest = d));
    flushAll(http);
    return { get current() { return latest!; } };
  }

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  it('transitions loading -> ready and requests every CSV once', () => {
    const seen: string[] = [];
    service.state$.subscribe(s => seen.push(s.status));
    expect(seen).toEqual(['loading']);
    flushAll(http);
    expect(seen).toEqual(['loading', 'ready']);
    http.verify();
  });

  it('exposes an error state when a CSV fails to load', () => {
    let st: DashboardState | undefined;
    service.state$.subscribe(s => (st = s));
    const fx = fixtures();
    for (const f of FILES.filter(x => x !== 'sucursales')) {
      http.expectOne(`assets/data/${f}.csv`).flush(fx[f]);
    }
    http.expectOne('assets/data/sucursales.csv').flush('nope', { status: 404, statusText: 'Not Found' });
    expect(st?.status).toBe('error');
    expect(st?.error).toContain('sucursales.csv');
    expect(st?.error).toContain('404');
  });

  it('computes branch totals and state breakdown', () => {
    const d = load();
    expect(d.current.totalSucursales).toBe(5);
    expect(d.current.activas).toBe(3);
    expect(d.current.inactivas).toBe(1);
    expect(d.current.pendientes).toBe(1);
    expect(d.current.pctActivas).toBe(60);
  });

  it('computes distributor and social coverage', () => {
    const d = load().current;
    expect(d.sucConDist).toBe(2);
    expect(d.pctCobDist).toBe(40);
    expect(d.sucConSocial).toBe(1);
    expect(d.pctCobSocial).toBe(20);
  });

  it('computes compensation totals and state counts', () => {
    const d = load().current;
    expect(d.totalComp).toBe(4);
    expect(d.compAbiertas).toBe(3);
    expect(d.compCerradas).toBe(1);
    expect(d.pctCompAbiertas).toBe(75);
    expect(d.compPendientes).toBe(3);
    expect(d.compAprobadas).toBe(1);
    expect(d.compEnRevision).toBe(0);
    expect(d.compRechazadas).toBe(0);
  });

  it('buckets open compensations by age', () => {
    const d = load().current;
    expect(d.compAging).toEqual({ b0_7: 1, b8_30: 1, b31plus: 1 });
    expect(d.edadPromedioComp).toBe(26);
  });

  it('computes mail metrics', () => {
    const d = load().current;
    expect(d.totalMails).toBe(4);
    expect(d.mailsEnviados).toBe(2);
    expect(d.mailsFallidos).toBe(2);
    expect(d.pctMailsFallidos).toBe(50);
    expect(d.reintentosSMTP).toBe(3);
  });

  it('computes monitoring/audit event counts', () => {
    const d = load().current;
    expect(d.totalEventos).toBe(3);
    expect(d.inserciones).toBe(2);
    expect(d.actualizaciones).toBe(1);
  });

  it('computes the operational risk score', () => {
    // 0.4*50 + 0.4*75 + 0.2*20 = 54
    expect(load().current.scoreRiesgo).toBe(54);
  });

  it('counts error types from compensation errors', () => {
    const d = load().current;
    expect(d.totalErrores).toBe(2);
    const tipos = d.erroresPorTipo.map(e => e.tipo).sort();
    expect(tipos).toEqual(['Timeout', 'Validation']);
  });

  it('geocodes branches and flags invalid coordinates', () => {
    const d = load().current;
    expect(d.sucursalesGeo.length).toBe(4); // S1,S2,S4,S5 have coords (S3 has none)
    expect(d.coordsInvalidas).toBe(1);      // S2 is outside Argentina's bounds
    expect(d.sinCoordenadas).toBe(1);       // S3
    const validIds = d.sucursalesGeo.filter(g => g.coordValida).map(g => g.id).sort();
    expect(validIds).toEqual(['S1', 'S4', 'S5']);
  });

  it('lists branches with data-quality issues only', () => {
    const ids = load().current.sucursalesConProblemas.map(s => s.id).sort();
    expect(ids).toEqual(['S2', 'S3', 'S4', 'S5']); // S1 is fully complete
  });

  it('builds full per-branch rows with intrinsic aggregates and risk', () => {
    const d = load().current;
    const s1 = d.sucursales.find(s => s.id === 'S1')!;
    expect(s1.compTotal).toBe(2);
    expect(s1.compAbiertas).toBe(2);
    expect(s1.mailsFallidos).toBe(1);
    expect(s1.riesgo).toBe(5); // 2*2 + 1
    expect(s1.tieneDist).toBe(true);
    expect(s1.tieneSocial).toBe(true);

    const s4 = d.sucursales.find(s => s.id === 'S4')!;
    expect(s4.isDeleted).toBe(true);
    expect(s4.riesgo).toBe(5); // deleted adds 5
  });

  it('produces sorted provincia rows carrying their id', () => {
    const d = load().current;
    expect(d.provincias.map(p => p.nombre)).toEqual(['Buenos Aires', 'Cordoba']);
    const ba = d.provincias.find(p => p.nombre === 'Buenos Aires')!;
    expect(ba.provinciaId).toBe('P1');
    expect(ba.total).toBe(3); // S1,S2,S5
  });

  it('has finite (non-NaN) month-over-month trends', () => {
    const t = load().current.trends;
    for (const v of Object.values(t)) expect(Number.isNaN(v)).toBe(false);
  });

  describe('global filter', () => {
    it('filters by provincia and cascades to all branches', () => {
      const d = load();
      service.setFilter({ provincia: 'P1' });
      expect(d.current.totalSucursales).toBe(3);
      expect(d.current.sucursales.every(s => s.provinciaId === 'P1')).toBe(true);
    });

    it('filters by region', () => {
      const d = load();
      service.setFilter({ region: 'Centro' });
      expect(d.current.totalSucursales).toBe(2); // P2: S3,S4
    });

    it('filters by estado', () => {
      const d = load();
      service.setFilter({ estado: 'Activa' });
      expect(d.current.totalSucursales).toBe(3); // S1,S3,S5
    });

    it('clearFilter restores the full set', () => {
      const d = load();
      service.setFilter({ provincia: 'P1' });
      expect(d.current.totalSucursales).toBe(3);
      service.clearFilter();
      expect(d.current.totalSucursales).toBe(5);
      expect(service.hasActiveFilter).toBe(false);
    });

    it('tracks whether a filter is active', () => {
      load();
      expect(service.hasActiveFilter).toBe(false);
      service.setFilter({ estado: 'Activa' });
      expect(service.hasActiveFilter).toBe(true);
    });
  });

  describe('date range filter', () => {
    it('scopes compensations to records within [desde, hasta]', () => {
      const d = load();
      // C1 (3d) and C2 (15d) are inside; C3 (60d) and C4 (90d) fall outside
      service.setFilter({ desde: daysAgo(20) });
      expect(d.current.totalComp).toBe(2);
      expect(d.current.compAbiertas).toBe(2);
    });

    it('does not change the (state-based) branch totals', () => {
      const d = load();
      service.setFilter({ desde: daysAgo(20) });
      expect(d.current.totalSucursales).toBe(5);
    });

    it('leaves records inside the window untouched', () => {
      const d = load();
      service.setFilter({ desde: daysAgo(20) });
      expect(d.current.totalMails).toBe(4); // all mails are within the last 8 days
      expect(d.current.totalEventos).toBe(3);
    });

    it('marks the filter active and clears it', () => {
      const d = load();
      service.setFilter({ desde: daysAgo(20) });
      expect(service.hasActiveFilter).toBe(true);
      service.clearFilter();
      expect(d.current.totalComp).toBe(4);
      expect(service.hasActiveFilter).toBe(false);
    });
  });

  describe('search & lookup', () => {
    it('returns [] for an empty term', () => {
      load();
      expect(service.searchSucursales('')).toEqual([]);
    });

    it('matches by name or email (case-insensitive)', () => {
      load();
      const res = service.searchSucursales('uno');
      expect(res.map(r => r.id)).toEqual(['S1']);
    });

    it('honors the result limit', () => {
      load();
      expect(service.searchSucursales('sucursal').length).toBe(5);
      expect(service.searchSucursales('sucursal', 2).length).toBe(2);
    });

    it('getSucursal finds by id and reports missing ones', () => {
      load();
      expect(service.getSucursal('S3')?.sinCoord).toBe(true);
      expect(service.getSucursal('nope')).toBeUndefined();
    });
  });
});
