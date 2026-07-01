import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { DashboardSource, DashboardFilter } from './dashboard-source';
import { FilterUrlSyncService } from './filter-url-sync';
import { EMPTY_FILTER } from './aggregations';

/** Doble de la fuente: `activeFilter$` real (BehaviorSubject) y `setFilter` que lo alimenta, como el servicio concreto. */
function makeFakeSource() {
  const filter$ = new BehaviorSubject<DashboardFilter>({ ...EMPTY_FILTER });
  return {
    _filter$: filter$,
    activeFilter$: filter$.asObservable(),
    setFilter: vi.fn((patch: Partial<DashboardFilter>) => filter$.next({ ...filter$.value, ...patch })),
  };
}

describe('FilterUrlSyncService', () => {
  let queryParams$: BehaviorSubject<Params>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let source: ReturnType<typeof makeFakeSource>;

  function build(initialParams: Params = {}): FilterUrlSyncService {
    queryParams$ = new BehaviorSubject<Params>(initialParams);
    router = { navigate: vi.fn() };
    source = makeFakeSource();
    TestBed.configureTestingModule({
      providers: [
        FilterUrlSyncService,
        { provide: DashboardSource, useValue: source },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$.asObservable() } },
      ],
    });
    return TestBed.inject(FilterUrlSyncService);
  }

  it('applies the filter from the URL on start (shared deep-link / bookmark)', () => {
    build({ provincia: 'P2', estado: 'Activa' }).start();
    expect(source.setFilter).toHaveBeenCalledWith(
      { provincia: 'P2', region: null, estado: 'Activa', desde: null, hasta: null },
    );
  });

  it('leaves URL and filter untouched when starting with an empty URL', () => {
    build({}).start();
    expect(source.setFilter).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not echo: applying the URL on start must not re-navigate', () => {
    build({ provincia: 'P2' }).start();
    expect(source.setFilter).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('writes the filter to the URL when it changes (filter → URL)', () => {
    build({}).start();
    router.navigate.mockClear();
    source._filter$.next({ ...EMPTY_FILTER, provincia: 'P1', desde: '2024-01-01' });
    expect(router.navigate).toHaveBeenCalledWith(
      [], { queryParams: { provincia: 'P1', desde: '2024-01-01' }, replaceUrl: true },
    );
  });

  it('reacts to browser back/forward changing the URL after start (URL → filter)', () => {
    build({}).start();
    source.setFilter.mockClear();
    queryParams$.next({ region: 'Centro' });
    expect(source.setFilter).toHaveBeenCalledWith(
      { provincia: null, region: 'Centro', estado: null, desde: null, hasta: null },
    );
  });

  it('start() is idempotent (no double subscription)', () => {
    const svc = build({ provincia: 'P2' });
    svc.start();
    source.setFilter.mockClear();
    svc.start();
    queryParams$.next({ provincia: 'P3' });
    expect(source.setFilter).toHaveBeenCalledTimes(1);
  });
});
