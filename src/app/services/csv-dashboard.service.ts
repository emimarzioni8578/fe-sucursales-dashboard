import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable, BehaviorSubject, forkJoin, of, combineLatest,
  map, filter, switchMap, startWith, catchError, shareReplay,
} from 'rxjs';
import * as Papa from 'papaparse';
import type { DashboardData, SucursalRow } from '@models/data-models.model';
import {
  type RawData, type Lookups, buildLookups, buildSucursalRows, computeDashboard,
  type DashboardFilter, EMPTY_FILTER, hasActiveFilter,
} from './aggregations';
import { DashboardSource, type DashboardState, type FilterOptions } from './dashboard-source';

/**
 * Fuente de datos basada en CSVs cargados y agregados en el cliente.
 * Implementación por defecto mientras no exista la API contra SQL Server.
 */
@Injectable()
export class CsvDashboardService extends DashboardSource {
  private http = inject(HttpClient);

  private reload$ = new BehaviorSubject<void>(undefined);
  private filter$ = new BehaviorSubject<DashboardFilter>({ ...EMPTY_FILTER });

  readonly state$: Observable<DashboardState> = this.reload$.pipe(
    switchMap(() => this.loadAllCsv().pipe(
      map((): DashboardState => ({ status: 'ready', data: null, error: null })),
      catchError((err: unknown): Observable<DashboardState> =>
        of({ status: 'error', data: null, error: this.describeError(err) })),
      startWith({ status: 'loading', data: null, error: null } as DashboardState),
    )),
    shareReplay(1),
  );

  private ready$ = this.state$.pipe(filter(s => s.status === 'ready'));

  readonly data$: Observable<DashboardData> = combineLatest([this.ready$, this.filter$]).pipe(
    map(([, f]) => computeDashboard(this.raw, this.lookups, this.allRows, f)),
    shareReplay(1),
  );

  readonly filterOptions$: Observable<FilterOptions> = this.ready$.pipe(
    map(() => ({
      provincias: this.raw.provincias
        .map(p => ({ id: p.ProvinciaId, nombre: p.NombreProvincia }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      regiones: [...new Set(this.raw.provincias.map(p => p.Region))].sort(),
      estados: this.raw.estados.map(e => e.NombreEstadoSucursal),
    })),
    shareReplay(1),
  );

  readonly activeFilter$ = this.filter$.asObservable();

  setFilter(patch: Partial<DashboardFilter>): void {
    this.filter$.next({ ...this.filter$.value, ...patch });
  }
  clearFilter(): void { this.filter$.next({ ...EMPTY_FILTER }); }
  get hasActiveFilter(): boolean { return hasActiveFilter(this.filter$.value); }

  reload(): void { this.reload$.next(); }

  private describeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const file = err.url?.split('/').pop() || 'desconocido';
      if (err.status === 404) {
        return `No se encontró el archivo de datos "${file}" (404). Verificá que exista en src/assets/data y que esté registrado en angular.json.`;
      }
      return `Error ${err.status} al cargar "${file}": ${err.statusText || 'fallo de red'}.`;
    }
    if (err instanceof Error) return err.message;
    return 'Ocurrió un error inesperado al procesar los datos.';
  }

  private raw!: RawData;
  /** Índices id→nombre derivados de `raw`. Invariantes tras la carga, memoizados una vez. */
  private lookups!: Lookups;

  private parseCsv<T>(text: string): T[] {
    return Papa.parse<T>(text, { header: true, dynamicTyping: false, skipEmptyLines: true }).data;
  }

  private loadCsv<T>(filename: string): Observable<T[]> {
    return this.http.get(`assets/data/${filename}`, { responseType: 'text' }).pipe(
      map(text => this.parseCsv<T>(text)),
    );
  }

  private loadAllCsv(): Observable<RawData> {
    return forkJoin({
      sucursales: this.loadCsv<RawData['sucursales'][number]>('sucursales.csv'),
      provincias: this.loadCsv<RawData['provincias'][number]>('provincias.csv'),
      localidades: this.loadCsv<RawData['localidades'][number]>('localidades.csv'),
      distribuidores: this.loadCsv<RawData['distribuidores'][number]>('distribuidores.csv'),
      sucDist: this.loadCsv<RawData['sucDist'][number]>('sucursal_distribuidores.csv'),
      sucSocial: this.loadCsv<RawData['sucSocial'][number]>('sucursal_social_networks.csv'),
      estados: this.loadCsv<RawData['estados'][number]>('estado_sucursal.csv'),
      compReqs: this.loadCsv<RawData['compReqs'][number]>('compensation_requests.csv'),
      compStates: this.loadCsv<RawData['compStates'][number]>('compensation_request_states.csv'),
      compErrors: this.loadCsv<RawData['compErrors'][number]>('compensation_request_errors.csv'),
      errors: this.loadCsv<RawData['errors'][number]>('errors.csv'),
      mails: this.loadCsv<RawData['mails'][number]>('mails.csv'),
      mailStates: this.loadCsv<RawData['mailStates'][number]>('mail_states.csv'),
      monitoring: this.loadCsv<RawData['monitoring'][number]>('monitoring.csv'),
      monActions: this.loadCsv<RawData['monActions'][number]>('monitoring_actions.csv'),
    }).pipe(map(r => {
      this.raw = r;
      this.lookups = buildLookups(r);
      this._allRows = undefined;
      return r;
    }));
  }

  // ---- Per-sucursal detail rows (built once from the full dataset, cached) ----
  private _allRows?: SucursalRow[];
  /** Full per-branch detail list (unfiltered), used by search, detail and the branch table. */
  private get allRows(): SucursalRow[] {
    if (this._allRows) return this._allRows;
    if (!this.raw) return [];
    this._allRows = buildSucursalRows(this.raw, this.lookups);
    return this._allRows;
  }

  searchSucursales(term: string, limit = 20): SucursalRow[] {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    const out: SucursalRow[] = [];
    for (const row of this.allRows) {
      if (`${row.id} ${row.nombre} ${row.email} ${row.provincia}`.toLowerCase().includes(t)) {
        out.push(row);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  getSucursal(id: string): SucursalRow | undefined {
    return this.allRows.find(r => r.id === id);
  }
}
