import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import {
  Observable, BehaviorSubject, forkJoin, of, combineLatest, EMPTY,
  map, filter, switchMap, startWith, catchError, shareReplay,
} from 'rxjs';
import type { DashboardData, SucursalRow } from '@models/data-models.model';
import { type DashboardFilter, EMPTY_FILTER, hasActiveFilter } from './aggregations';
import { DashboardSource, type DashboardState, type FilterOptions } from './dashboard-source';

/**
 * Fuente de datos contra el backend (SQL Server vía API REST). STUB / plantilla.
 *
 * A diferencia de `CsvDashboardService`, acá la agregación la hace el servidor
 * (`GROUP BY`/`COUNT`/`SUM`) y la API devuelve directamente un `DashboardData` por
 * cada combinación de filtros. `DashboardFilter` viaja como query params.
 *
 * No está activa: para usarla, en `app.config.ts` cambiar
 * `{ provide: DashboardSource, useClass: CsvDashboardService }` por `ApiDashboardService`
 * y ajustar `baseUrl` + los endpoints reales (idealmente la base via `environment.ts`).
 */
@Injectable()
export class ApiDashboardService extends DashboardSource {
  private http = inject(HttpClient);

  /** Base de la API. Mover a environment.ts cuando se integre el backend. */
  private readonly baseUrl = '/api';

  private reload$ = new BehaviorSubject<void>(undefined);
  private filter$ = new BehaviorSubject<DashboardFilter>({ ...EMPTY_FILTER });

  /** Datos de referencia cacheados al iniciar (opciones de filtro + sucursales para la búsqueda). */
  private filterOptions: FilterOptions = { provincias: [], regiones: [], estados: [] };
  private allBranches: SucursalRow[] = [];

  readonly activeFilter$ = this.filter$.asObservable();

  /** El estado del shell depende de poder cargar los datos de referencia una vez. */
  readonly state$: Observable<DashboardState> = this.reload$.pipe(
    switchMap(() => this.loadReference().pipe(
      map((): DashboardState => ({ status: 'ready', data: null, error: null })),
      catchError((err: unknown): Observable<DashboardState> =>
        of({ status: 'error', data: null, error: this.describeError(err) })),
      startWith({ status: 'loading', data: null, error: null } as DashboardState),
    )),
    shareReplay(1),
  );

  private ready$ = this.state$.pipe(filter(s => s.status === 'ready'));

  /** Por cada cambio de filtro (ya estando listo) pide al backend el dashboard agregado. */
  readonly data$: Observable<DashboardData> = combineLatest([this.ready$, this.filter$]).pipe(
    switchMap(([, f]) =>
      this.http.get<DashboardData>(`${this.baseUrl}/dashboard`, { params: this.toParams(f) }).pipe(
        catchError(() => EMPTY), // el error de carga del shell ya se refleja en state$
      ),
    ),
    shareReplay(1),
  );

  readonly filterOptions$: Observable<FilterOptions> = this.ready$.pipe(
    map(() => this.filterOptions),
    shareReplay(1),
  );

  setFilter(patch: Partial<DashboardFilter>): void {
    this.filter$.next({ ...this.filter$.value, ...patch });
  }
  clearFilter(): void { this.filter$.next({ ...EMPTY_FILTER }); }
  get hasActiveFilter(): boolean { return hasActiveFilter(this.filter$.value); }

  reload(): void { this.reload$.next(); }

  // La búsqueda del toolbar es sincrónica: se sirve desde la cache local de sucursales.
  searchSucursales(term: string, limit = 20): SucursalRow[] {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    const out: SucursalRow[] = [];
    for (const row of this.allBranches) {
      if (`${row.id} ${row.nombre} ${row.email} ${row.provincia}`.toLowerCase().includes(t)) {
        out.push(row);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  getSucursal(id: string): SucursalRow | undefined {
    return this.allBranches.find(r => r.id === id);
  }

  /** Carga única de datos de referencia: opciones de filtro y la lista de sucursales para búsqueda. */
  private loadReference(): Observable<unknown> {
    return forkJoin({
      options: this.http.get<FilterOptions>(`${this.baseUrl}/dashboard/filters`),
      branches: this.http.get<SucursalRow[]>(`${this.baseUrl}/sucursales`),
    }).pipe(map(({ options, branches }) => {
      this.filterOptions = options;
      this.allBranches = branches;
      return null;
    }));
  }

  /** Traduce el filtro activo a query params (omitiendo los criterios nulos). */
  private toParams(f: DashboardFilter): HttpParams {
    let params = new HttpParams();
    (Object.keys(f) as (keyof DashboardFilter)[]).forEach(key => {
      const value = f[key];
      if (value) params = params.set(key, value);
    });
    return params;
  }

  private describeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return `Error ${err.status} al consultar la API: ${err.statusText || 'fallo de red'}.`;
    }
    if (err instanceof Error) return err.message;
    return 'Ocurrió un error inesperado al consultar la API.';
  }
}
