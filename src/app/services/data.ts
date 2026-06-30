import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable, BehaviorSubject, forkJoin, of, combineLatest,
  map, filter, switchMap, startWith, catchError, shareReplay
} from 'rxjs';
import * as Papa from 'papaparse';
import type {
  DashboardData, ProvinciaData, CompMes, AuditMes, AuditTabla,
  ErrorTipo, MailAsunto, Sucursal, Provincia, Localidad, Distribuidor,
  SucursalDistribuidor, SucursalSocialNetwork, EstadoSucursal,
  CompensationRequest, CompensationRequestState, Mail, MailState,
  Monitoring, MonitoringAction, CompensationRequestError, Error,
  SucursalGeo, CompAging, MailMes, AperturaMes, DashboardTrends, SucursalIssue, SucursalRow
} from '../models/data-models.model';

export type DashboardStatus = 'loading' | 'ready' | 'error';
export interface DashboardState {
  status: DashboardStatus;
  data: DashboardData | null;
  error: string | null;
}

/** Active global filter applied across all pages. `null` = sin filtrar. */
export interface DashboardFilter {
  provincia: string | null; // ProvinciaId
  region: string | null;
  estado: string | null;    // NombreEstadoSucursal
  desde: string | null;     // YYYY-MM-DD (inclusive) — acota compensaciones, mails y auditoría
  hasta: string | null;     // YYYY-MM-DD (inclusive)
}
const EMPTY_FILTER: DashboardFilter = { provincia: null, region: null, estado: null, desde: null, hasta: null };

export interface FilterOptions {
  provincias: { id: string; nombre: string }[];
  regiones: string[];
  estados: string[];
}

/** Bounding box aproximado de Argentina continental para validar coordenadas. */
const AR_BOUNDS = { latMin: -55.1, latMax: -21.7, lngMin: -73.6, lngMax: -53.6 };

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  private reload$ = new BehaviorSubject<void>(undefined);
  private filter$ = new BehaviorSubject<DashboardFilter>({ ...EMPTY_FILTER });

  /** Loading/ready/error state for the app shell. Emits 'loading' immediately, then the result. */
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

  /** Computed dashboard data; re-emits whenever the active filter changes. */
  readonly data$: Observable<DashboardData> = combineLatest([this.ready$, this.filter$]).pipe(
    map(([, f]) => this.computeDashboard(f)),
    shareReplay(1),
  );

  /** Options to populate the global filter controls. */
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
  get hasActiveFilter(): boolean {
    const f = this.filter$.value;
    return !!(f.provincia || f.region || f.estado || f.desde || f.hasta);
  }

  /** Re-run the CSV load (e.g. after a transient failure). */
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

  private raw!: {
    sucursales: Sucursal[]; provincias: Provincia[]; localidades: Localidad[];
    distribuidores: Distribuidor[]; sucDist: SucursalDistribuidor[];
    sucSocial: SucursalSocialNetwork[]; estados: EstadoSucursal[];
    compReqs: CompensationRequest[]; compStates: CompensationRequestState[];
    compErrors: CompensationRequestError[]; errors: Error[];
    mails: Mail[]; mailStates: MailState[];
    monitoring: Monitoring[]; monActions: MonitoringAction[];
  };

  private parseCsv<T>(text: string): T[] {
    return Papa.parse<T>(text, { header: true, dynamicTyping: false, skipEmptyLines: true }).data;
  }

  private loadCsv<T>(filename: string): Observable<T[]> {
    return this.http.get(`assets/data/${filename}`, { responseType: 'text' }).pipe(
      map(text => this.parseCsv<T>(text))
    );
  }

  private loadAllCsv() {
    return forkJoin({
      sucursales: this.loadCsv<Sucursal>('sucursales.csv'),
      provincias: this.loadCsv<Provincia>('provincias.csv'),
      localidades: this.loadCsv<Localidad>('localidades.csv'),
      distribuidores: this.loadCsv<Distribuidor>('distribuidores.csv'),
      sucDist: this.loadCsv<SucursalDistribuidor>('sucursal_distribuidores.csv'),
      sucSocial: this.loadCsv<SucursalSocialNetwork>('sucursal_social_networks.csv'),
      estados: this.loadCsv<EstadoSucursal>('estado_sucursal.csv'),
      compReqs: this.loadCsv<CompensationRequest>('compensation_requests.csv'),
      compStates: this.loadCsv<CompensationRequestState>('compensation_request_states.csv'),
      compErrors: this.loadCsv<CompensationRequestError>('compensation_request_errors.csv'),
      errors: this.loadCsv<Error>('errors.csv'),
      mails: this.loadCsv<Mail>('mails.csv'),
      mailStates: this.loadCsv<MailState>('mail_states.csv'),
      monitoring: this.loadCsv<Monitoring>('monitoring.csv'),
      monActions: this.loadCsv<MonitoringAction>('monitoring_actions.csv'),
    }).pipe(map(r => { this.raw = r as any; this._allRows = undefined; return r; }));
  }

  // ---- Per-sucursal detail rows (built once from the full dataset, cached) ----
  private _allRows?: SucursalRow[];
  /** Full per-branch detail list (unfiltered), used by search, detail and the branch table. */
  get allRows(): SucursalRow[] {
    if (this._allRows) return this._allRows;
    if (!this.raw) return [];
    this._allRows = this.buildAllRows();
    return this._allRows;
  }

  private buildAllRows(): SucursalRow[] {
    const r = this.raw;
    const estadoMap = new Map(r.estados.map(e => [e.EstadoSucursalId, e.NombreEstadoSucursal]));
    const provMap = new Map(r.provincias.map(p => [p.ProvinciaId, p.NombreProvincia]));
    const provRegionMap = new Map(r.provincias.map(p => [p.ProvinciaId, p.Region]));
    const localidadMap = new Map(r.localidades.map(l => [l.LocalidadId, l.NombreLocalidad]));
    const mailStateMap = new Map(r.mailStates.map(s => [s.MailStateId, s.NombreEstadoMail]));
    const distSet = new Set(r.sucDist.map(d => d.SucursalId));
    const socialSet = new Set(r.sucSocial.map(s => s.SucursalId));

    const compBySuc = new Map<string, { total: number; abiertas: number }>();
    r.compReqs.forEach(c => {
      const d = compBySuc.get(c.SucursalId) || { total: 0, abiertas: 0 };
      d.total++; if (c.IsOpen === '1') d.abiertas++;
      compBySuc.set(c.SucursalId, d);
    });
    const mailBySuc = new Map<string, { total: number; fallidos: number }>();
    r.mails.forEach(m => {
      const d = mailBySuc.get(m.SucursalId) || { total: 0, fallidos: 0 };
      d.total++; if (mailStateMap.get(m.MailStateId) === 'Failed') d.fallidos++;
      mailBySuc.set(m.SucursalId, d);
    });

    return r.sucursales.map(s => {
      const lat = parseFloat(s.Latitud), lng = parseFloat(s.Longitud);
      const hasCoord = !!(s.Latitud?.trim() && s.Longitud?.trim()) && !isNaN(lat) && !isNaN(lng);
      const coordValida = hasCoord && lat >= AR_BOUNDS.latMin && lat <= AR_BOUNDS.latMax && lng >= AR_BOUNDS.lngMin && lng <= AR_BOUNDS.lngMax;
      const comp = compBySuc.get(s.SucursalId) || { total: 0, abiertas: 0 };
      const mail = mailBySuc.get(s.SucursalId) || { total: 0, fallidos: 0 };
      const isDeleted = s.IsDeleted === '1';
      return {
        id: s.SucursalId, nombre: s.NombreSucursal,
        provinciaId: s.ProvinciaId, provincia: provMap.get(s.ProvinciaId) || '—',
        region: provRegionMap.get(s.ProvinciaId) || '—', localidad: localidadMap.get(s.LocalidadId) || '—',
        estadoId: s.EstadoSucursalId, estado: estadoMap.get(s.EstadoSucursalId) || 'Desconocido',
        email: s.Email, telefono: s.Telefono, direccion: s.Direccion, codigoPostal: s.CodigoPostal,
        fechaApertura: s.FechaApertura,
        lat: hasCoord ? lat : null, lng: hasCoord ? lng : null,
        coordValida, coordInvalida: hasCoord && !coordValida, sinCoord: !hasCoord,
        tieneDist: distSet.has(s.SucursalId), tieneSocial: socialSet.has(s.SucursalId),
        compTotal: comp.total, compAbiertas: comp.abiertas, mailsTotal: mail.total, mailsFallidos: mail.fallidos,
        riesgo: comp.abiertas * 2 + mail.fallidos + (isDeleted ? 5 : 0), isDeleted,
      };
    });
  }

  private rowMatches(row: SucursalRow, f: DashboardFilter): boolean {
    if (f.provincia && row.provinciaId !== f.provincia) return false;
    if (f.region && row.region !== f.region) return false;
    if (f.estado && row.estado !== f.estado) return false;
    return true;
  }

  /** Free-text search over all branches (ignores the active filter). */
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

  private computeDashboard(f: DashboardFilter = EMPTY_FILTER): DashboardData {
    const r = this.raw;
    const pct = (a: number, b: number, dp = 1) => b ? +((a / b) * 100).toFixed(dp) : 0;

    const estadoMap = new Map(r.estados.map(e => [e.EstadoSucursalId, e.NombreEstadoSucursal]));
    const provMap = new Map(r.provincias.map(p => [p.ProvinciaId, p.NombreProvincia]));
    const provRegionMap = new Map(r.provincias.map(p => [p.ProvinciaId, p.Region]));
    const compStateMap = new Map(r.compStates.map(s => [s.CompensationRequestStateId, s.NombreEstadoCompensacion]));
    const mailStateMap = new Map(r.mailStates.map(s => [s.MailStateId, s.NombreEstadoMail]));
    const monActionMap = new Map(r.monActions.map(a => [a.MonitoringActionId, a.NombreAccion]));
    const errorMap = new Map(r.errors.map(e => [e.ErrorId, e.ErrorName]));
    const sucProvMap = new Map(r.sucursales.map(s => [s.SucursalId, s.ProvinciaId]));

    // --- Apply global filter to the sucursal universe and cascade ---
    const matches = (s: Sucursal): boolean => {
      if (f.provincia && s.ProvinciaId !== f.provincia) return false;
      if (f.region && provRegionMap.get(s.ProvinciaId) !== f.region) return false;
      if (f.estado && estadoMap.get(s.EstadoSucursalId) !== f.estado) return false;
      return true;
    };
    // Date-range predicate (acota registros con timestamp: comp, mails, auditoría).
    const inRange = (dateStr: string): boolean => {
      if (!f.desde && !f.hasta) return true;
      const day = (dateStr || '').slice(0, 10);
      if (!day) return false;
      if (f.desde && day < f.desde) return false;
      if (f.hasta && day > f.hasta) return false;
      return true;
    };

    const sucursales = r.sucursales.filter(matches);
    const incSet = new Set(sucursales.map(s => s.SucursalId));
    const compReqs = r.compReqs.filter(c => incSet.has(c.SucursalId) && inRange(c.CreatedAt));
    const compIdSet = new Set(compReqs.map(c => c.CompensationRequestId));
    const compErrors = r.compErrors.filter(e => compIdSet.has(e.CompensationRequestId));
    const mails = r.mails.filter(m => incSet.has(m.SucursalId) && inRange(m.CreatedAt));
    const sucDist = r.sucDist.filter(d => incSet.has(d.SucursalId));
    const sucSocial = r.sucSocial.filter(s => incSet.has(s.SucursalId));
    const monitoring = r.monitoring.filter(m => inRange(m.CreatedAt)); // sin SucursalId: la auditoría es global salvo por fecha

    const totalSucursales = sucursales.length;

    let activas = 0, inactivas = 0, pendientes = 0, eliminadas = 0;
    const sucCoordMap = new Map<string, boolean>();
    sucursales.forEach(s => {
      const est = estadoMap.get(s.EstadoSucursalId);
      if (est === 'Activa') activas++;
      else if (est === 'Inactiva') inactivas++;
      else if (est === 'Pendiente') pendientes++;
      if (s.IsDeleted === '1') eliminadas++;
      sucCoordMap.set(s.SucursalId, !!(s.Latitud?.trim() && s.Longitud?.trim()));
    });

    const pctActivas = pct(activas, totalSucursales);

    const sucConDist = new Set(sucDist.map(d => d.SucursalId)).size;
    const pctCobDist = pct(sucConDist, totalSucursales);

    const sucConSocial = new Set(sucSocial.map(s => s.SucursalId)).size;
    const pctCobSocial = pct(sucConSocial, totalSucursales);

    const totalComp = compReqs.length;
    const compAbiertas = compReqs.filter(c => c.IsOpen === '1').length;
    const compCerradas = totalComp - compAbiertas;
    const pctCompAbiertas = pct(compAbiertas, totalComp);

    let compPendientes = 0, compEnRevision = 0, compAprobadas = 0, compRechazadas = 0;
    compReqs.forEach(c => {
      const st = compStateMap.get(c.CompensationRequestStateId);
      if (st === 'Pending') compPendientes++;
      else if (st === 'InReview') compEnRevision++;
      else if (st === 'Approved') compAprobadas++;
      else if (st === 'Rejected') compRechazadas++;
    });

    // --- Aging de compensaciones abiertas ---
    const now = Date.now();
    let sumDays = 0, countOpen = 0, b0_7 = 0, b8_30 = 0, b31plus = 0;
    const compAbiertasBySuc = new Map<string, number>();
    compReqs.filter(c => c.IsOpen === '1').forEach(c => {
      const days = Math.floor((now - new Date(c.CreatedAt).getTime()) / 86400000);
      sumDays += days; countOpen++;
      if (days <= 7) b0_7++; else if (days <= 30) b8_30++; else b31plus++;
      compAbiertasBySuc.set(c.SucursalId, (compAbiertasBySuc.get(c.SucursalId) || 0) + 1);
    });
    const edadPromedioComp = countOpen ? Math.round(sumDays / countOpen) : 0;
    const compAging: CompAging = { b0_7, b8_30, b31plus };

    const totalErrores = compErrors.length;

    const totalMails = mails.length;
    let mailsEnviados = 0, mailsFallidos = 0, reintentosSMTP = 0;
    const mailsFallidosBySuc = new Map<string, number>();
    mails.forEach(m => {
      const st = mailStateMap.get(m.MailStateId);
      if (st === 'Sent') mailsEnviados++;
      else if (st === 'Failed') { mailsFallidos++; mailsFallidosBySuc.set(m.SucursalId, (mailsFallidosBySuc.get(m.SucursalId) || 0) + 1); }
      reintentosSMTP += parseInt(m.RetryCount) || 0;
    });
    const pctMailsFallidos = pct(mailsFallidos, totalMails);

    const totalEventos = monitoring.length;
    let inserciones = 0, actualizaciones = 0, softDeletes = 0, bulkInserts = 0, bulkUpdates = 0;
    monitoring.forEach(m => {
      const ac = m.MonitoringActionId ? monActionMap.get(m.MonitoringActionId) : undefined;
      if (ac === 'Insert') inserciones++;
      else if (ac === 'Update') actualizaciones++;
      else if (ac === 'SoftDelete') softDeletes++;
      else if (ac === 'BulkInsert') bulkInserts++;
      else if (ac === 'BulkUpdate') bulkUpdates++;
    });

    const pctSoftDelete = pct(eliminadas, totalSucursales, 2);
    const scoreRiesgo = +(0.4 * pctMailsFallidos + 0.4 * pctCompAbiertas + 0.2 * pctSoftDelete).toFixed(2);

    // --- Geo + validación de coordenadas (por sucursal) ---
    let coordsInvalidas = 0;
    const sucursalesGeo: SucursalGeo[] = [];
    sucursales.forEach(s => {
      const lat = parseFloat(s.Latitud), lng = parseFloat(s.Longitud);
      const hasCoord = !!(s.Latitud?.trim() && s.Longitud?.trim()) && !isNaN(lat) && !isNaN(lng);
      if (!hasCoord) return;
      const valida = lat >= AR_BOUNDS.latMin && lat <= AR_BOUNDS.latMax && lng >= AR_BOUNDS.lngMin && lng <= AR_BOUNDS.lngMax;
      if (!valida) coordsInvalidas++;
      const ca = compAbiertasBySuc.get(s.SucursalId) || 0;
      const mf = mailsFallidosBySuc.get(s.SucursalId) || 0;
      sucursalesGeo.push({
        id: s.SucursalId, nombre: s.NombreSucursal, lat, lng,
        estado: estadoMap.get(s.EstadoSucursalId) || 'Desconocido',
        provincia: provMap.get(s.ProvinciaId) || '—',
        region: provRegionMap.get(s.ProvinciaId) || '—',
        compAbiertas: ca, mailsFallidos: mf,
        riesgo: ca * 2 + mf + (s.IsDeleted === '1' ? 5 : 0),
        coordValida: valida,
      });
    });

    // --- Sucursales con problemas de calidad (lista accionable) ---
    const distSet = new Set(sucDist.map(d => d.SucursalId));
    const socialSet = new Set(sucSocial.map(s => s.SucursalId));
    const sucursalesConProblemas: SucursalIssue[] = [];
    sucursales.forEach(s => {
      const lat = parseFloat(s.Latitud), lng = parseFloat(s.Longitud);
      const hasCoord = !!(s.Latitud?.trim() && s.Longitud?.trim()) && !isNaN(lat) && !isNaN(lng);
      const coordInvalida = hasCoord && !(lat >= AR_BOUNDS.latMin && lat <= AR_BOUNDS.latMax && lng >= AR_BOUNDS.lngMin && lng <= AR_BOUNDS.lngMax);
      const sinCoord = !hasCoord;
      const sinDist = !distSet.has(s.SucursalId);
      const sinSocial = !socialSet.has(s.SucursalId);
      if (sinCoord || coordInvalida || sinDist || sinSocial) {
        sucursalesConProblemas.push({
          id: s.SucursalId, nombre: s.NombreSucursal,
          provincia: provMap.get(s.ProvinciaId) || '—',
          estado: estadoMap.get(s.EstadoSucursalId) || 'Desconocido',
          sinCoord, coordInvalida, sinDist, sinSocial,
        });
      }
    });

    // --- Provincia data ---
    const provData = new Map<string, any>();
    r.provincias.forEach(p => {
      provData.set(p.ProvinciaId, {
        nombre: p.NombreProvincia, region: p.Region,
        total: 0, activas: 0, inactivas: 0, pendientes: 0,
        sinCoord: 0, conDist: new Set(), conSocial: new Set(),
        compTotal: 0, compAbiertas: 0, mailsTotal: 0, mailsFallidos: 0,
      });
    });
    sucursales.forEach(s => {
      const d = provData.get(s.ProvinciaId); if (!d) return;
      d.total++; const est = estadoMap.get(s.EstadoSucursalId);
      if (est === 'Activa') d.activas++;
      else if (est === 'Inactiva') d.inactivas++;
      else if (est === 'Pendiente') d.pendientes++;
      if (!sucCoordMap.get(s.SucursalId)) d.sinCoord++;
    });
    new Set(sucDist.map(d => d.SucursalId)).forEach(sid => {
      const d = provData.get(sucProvMap.get(sid)!); if (d) d.conDist.add(sid);
    });
    new Set(sucSocial.map(s => s.SucursalId)).forEach(sid => {
      const d = provData.get(sucProvMap.get(sid)!); if (d) d.conSocial.add(sid);
    });
    compReqs.forEach(c => {
      const d = provData.get(sucProvMap.get(c.SucursalId)!); if (!d) return;
      d.compTotal++; if (c.IsOpen === '1') d.compAbiertas++;
    });
    mails.forEach(m => {
      const d = provData.get(sucProvMap.get(m.SucursalId)!); if (!d) return;
      d.mailsTotal++; if (mailStateMap.get(m.MailStateId) === 'Failed') d.mailsFallidos++;
    });

    const provincias: ProvinciaData[] = [];
    provData.forEach((d, provinciaId) => {
      if (d.total === 0) return; // ocultar provincias vacías cuando hay filtro
      provincias.push({
        provinciaId,
        nombre: d.nombre, region: d.region,
        total: d.total, activas: d.activas, inactivas: d.inactivas, pendientes: d.pendientes,
        sinCoord: d.sinCoord, sinSocial: d.total - d.conSocial.size, sinDist: d.total - d.conDist.size,
        conDistCount: d.conDist.size, conSocialCount: d.conSocial.size,
        pctActivas: pct(d.activas, d.total), pctCoberturaDist: pct(d.conDist.size, d.total),
        pctCoberturaSocial: pct(d.conSocial.size, d.total),
        compAbiertas: d.compAbiertas, compTotal: d.compTotal,
        mailsTotal: d.mailsTotal, mailsFallidos: d.mailsFallidos, pctMailsFallidos: pct(d.mailsFallidos, d.mailsTotal),
      });
    });
    provincias.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // --- Series mensuales ---
    const compPorMesMap = new Map<string, CompMes>();
    compReqs.forEach(c => {
      const key = (c.CreatedAt || '').substring(0, 7); if (!key) return;
      if (!compPorMesMap.has(key)) compPorMesMap.set(key, { mes: key, total: 0, abiertas: 0 });
      const d = compPorMesMap.get(key)!; d.total++; if (c.IsOpen === '1') d.abiertas++;
    });
    const compPorMes = [...compPorMesMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

    const mailsPorMesMap = new Map<string, MailMes>();
    mails.forEach(m => {
      const key = (m.CreatedAt || '').substring(0, 7); if (!key) return;
      if (!mailsPorMesMap.has(key)) mailsPorMesMap.set(key, { mes: key, total: 0, fallidos: 0 });
      const d = mailsPorMesMap.get(key)!; d.total++; if (mailStateMap.get(m.MailStateId) === 'Failed') d.fallidos++;
    });
    const mailsPorMes = [...mailsPorMesMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

    const aperturasPorMesMap = new Map<string, AperturaMes>();
    sucursales.forEach(s => {
      const key = (s.FechaApertura || '').substring(0, 7); if (!key) return;
      if (!aperturasPorMesMap.has(key)) aperturasPorMesMap.set(key, { mes: key, total: 0 });
      aperturasPorMesMap.get(key)!.total++;
    });
    const aperturasPorMes = [...aperturasPorMesMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

    // --- Tendencias (último mes vs. anterior) ---
    const momPct = (arr: { mes: string }[], sel: (x: any) => number): number => {
      const n = arr.length; if (n < 2) return 0;
      const cur = sel(arr[n - 1]), prev = sel(arr[n - 2]);
      return prev ? +(((cur - prev) / prev) * 100).toFixed(1) : (cur ? 100 : 0);
    };
    const trends: DashboardTrends = {
      compTotal: momPct(compPorMes, (x) => x.total),
      compAbiertas: momPct(compPorMes, (x) => x.abiertas),
      mailsTotal: momPct(mailsPorMes, (x) => x.total),
      mailsFallidos: momPct(mailsPorMes, (x) => x.fallidos),
      nuevasSucursales: momPct(aperturasPorMes, (x) => x.total),
    };

    // --- Auditoría (global) ---
    const auditPorMesMap = new Map<string, any>();
    monitoring.forEach(m => {
      const key = (m.CreatedAt || '').substring(0, 7); if (!key) return;
      if (!auditPorMesMap.has(key)) auditPorMesMap.set(key, { mes: key });
      const ac = m.MonitoringActionId ? monActionMap.get(m.MonitoringActionId) : undefined;
      if (ac) { const k = ac.toLowerCase(); auditPorMesMap.get(key)[k] = (auditPorMesMap.get(key)[k] || 0) + 1; }
    });
    const auditPorMes: AuditMes[] = [...auditPorMesMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

    const auditPorTablaMap = new Map<string, any>();
    monitoring.forEach(m => {
      const tbl = m.AffectedTable;
      if (!auditPorTablaMap.has(tbl)) auditPorTablaMap.set(tbl, { tabla: tbl });
      const ac = m.MonitoringActionId ? monActionMap.get(m.MonitoringActionId) : undefined;
      if (ac) { const k = ac.toLowerCase(); auditPorTablaMap.get(tbl)[k] = (auditPorTablaMap.get(tbl)[k] || 0) + 1; }
    });
    const auditPorTabla: AuditTabla[] = [...auditPorTablaMap.values()].sort((a, b) => a.tabla.localeCompare(b.tabla));

    // --- Errores por tipo ---
    const errCount = new Map<string, number>();
    compErrors.forEach(e => {
      const name = e.ErrorId ? (errorMap.get(e.ErrorId) || 'Unknown') : 'Unknown';
      errCount.set(name, (errCount.get(name) || 0) + 1);
    });
    const erroresPorTipo: ErrorTipo[] = [...errCount.entries()].map(([tipo, total]) => ({ tipo, total }));

    // --- Mails por asunto ---
    const asuntoMap = new Map<string, { total: number; fallidos: number }>();
    mails.forEach(m => {
      if (!asuntoMap.has(m.Subject)) asuntoMap.set(m.Subject, { total: 0, fallidos: 0 });
      const d = asuntoMap.get(m.Subject)!; d.total++; if (mailStateMap.get(m.MailStateId) === 'Failed') d.fallidos++;
    });
    const mailsPorAsunto: MailAsunto[] = [...asuntoMap.entries()].map(([asunto, v]) => ({ asunto, ...v }));

    // --- Calidad de datos ---
    const sinRedSocial = provincias.reduce((s, p) => s + p.sinSocial, 0);
    const sinDistribuidor = provincias.reduce((s, p) => s + p.sinDist, 0);
    const sinCoordenadas = provincias.reduce((s, p) => s + p.sinCoord, 0);

    return {
      loading: false,
      totalSucursales, activas, inactivas, pendientes, pctActivas,
      sucConDist, pctCobDist, sucConSocial, pctCobSocial,
      totalComp, compAbiertas, compCerradas, pctCompAbiertas,
      compPendientes, compEnRevision, compAprobadas, compRechazadas,
      edadPromedioComp, totalErrores, compAging,
      totalMails, mailsEnviados, mailsFallidos, pctMailsFallidos, reintentosSMTP,
      totalEventos, inserciones, actualizaciones, softDeletes, bulkInserts, bulkUpdates,
      scoreRiesgo, sinRedSocial, sinDistribuidor, sinCoordenadas,
      pctSinSocial: pct(sinRedSocial, totalSucursales), pctSinDist: pct(sinDistribuidor, totalSucursales),
      pctSinCoord: pct(sinCoordenadas, totalSucursales),
      provincias, compPorMes, mailsPorMes, aperturasPorMes, trends,
      auditPorMes, auditPorTabla, erroresPorTipo, mailsPorAsunto,
      sucursalesGeo, coordsInvalidas, sucursalesConProblemas,
      sucursales: this.allRows.filter(row => this.rowMatches(row, f)),
    };
  }
}
