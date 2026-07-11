import type {
  Sucursal, CompensationRequest, CompensationRequestError, Mail,
  SucursalDistribuidor, SucursalSocialNetwork, SucursalRating, Monitoring, SucursalRow,
} from '@models/data-models.model';
import { isFlag } from '@models/domain.constants';
import type { Lookups, RawData } from './lookups';

/** Filtro global activo, aplicado en todas las páginas. `null` = sin filtrar. */
export interface DashboardFilter {
  provincia: string | null; // ProvinciaId
  region: string | null;
  estado: string | null;    // NombreEstadoSucursal
  desde: string | null;     // YYYY-MM-DD (inclusive) — acota compensaciones, mails y auditoría
  hasta: string | null;     // YYYY-MM-DD (inclusive)
}

export const EMPTY_FILTER: DashboardFilter = {
  provincia: null, region: null, estado: null, desde: null, hasta: null,
};

/** Opciones para poblar los controles del filtro global. */
export interface FilterOptions {
  provincias: { id: string; nombre: string }[];
  regiones: string[];
  estados: string[];
}

/** Universo de datos ya acotado por el filtro global; alimenta a todos los agregadores. */
export interface FilteredData {
  sucursales: Sucursal[];
  incSet: Set<string>;
  compReqs: CompensationRequest[];
  compErrors: CompensationRequestError[];
  mails: Mail[];
  sucDist: SucursalDistribuidor[];
  sucSocial: SucursalSocialNetwork[];
  ratings: SucursalRating[];
  monitoring: Monitoring[];
}

/** ¿La sucursal cruda cae dentro del filtro de provincia/region/estado? */
function sucursalMatches(s: Sucursal, f: DashboardFilter, lk: Lookups): boolean {
  if (f.provincia && s.ProvinciaId !== f.provincia) return false;
  if (f.region && lk.provinciaRegion.get(s.ProvinciaId) !== f.region) return false;
  if (f.estado && lk.estado.get(s.EstadoSucursalId) !== f.estado) return false;
  return true;
}

/** Predicado de rango de fechas (acota registros con timestamp: comp, mails, auditoría). */
function inRange(dateStr: string, f: DashboardFilter): boolean {
  if (!f.desde && !f.hasta) return true;
  const day = (dateStr || '').slice(0, 10);
  if (!day) return false;
  if (f.desde && day < f.desde) return false;
  if (f.hasta && day > f.hasta) return false;
  return true;
}

/** Aplica el filtro global al universo de sucursales y propaga en cascada. */
export function applyFilter(r: RawData, lk: Lookups, f: DashboardFilter): FilteredData {
  const sucursales = r.sucursales.filter(s => sucursalMatches(s, f, lk));
  const incSet = new Set(sucursales.map(s => s.SucursalId));
  const compReqs = r.compReqs.filter(c => incSet.has(c.SucursalId) && inRange(c.CreatedAt, f));
  const compIdSet = new Set(compReqs.map(c => c.CompensationRequestId));
  const compErrors = r.compErrors.filter(e => compIdSet.has(e.CompensationRequestId));
  const mails = r.mails.filter(m => incSet.has(m.SucursalId) && inRange(m.CreatedAt, f));
  const sucDist = r.sucDist.filter(d => incSet.has(d.SucursalId));
  const sucSocial = r.sucSocial.filter(s => incSet.has(s.SucursalId));
  // Los ratings son estado vigente (como distribuidores/redes): no los acota la fecha.
  const ratings = r.ratings.filter(rt => incSet.has(rt.SucursalId));
  // La auditoría no tiene SucursalId: es global salvo por fecha.
  const monitoring = r.monitoring.filter(m => inRange(m.CreatedAt, f));
  return { sucursales, incSet, compReqs, compErrors, mails, sucDist, sucSocial, ratings, monitoring };
}

/** Filtra filas de detalle ya construidas (`SucursalRow`) por provincia/region/estado. */
export function rowMatches(row: SucursalRow, f: DashboardFilter): boolean {
  if (f.provincia && row.provinciaId !== f.provincia) return false;
  if (f.region && row.region !== f.region) return false;
  if (f.estado && row.estado !== f.estado) return false;
  return true;
}

/** ¿Hay al menos un criterio activo en el filtro? */
export function hasActiveFilter(f: DashboardFilter): boolean {
  return !!(f.provincia || f.region || f.estado || f.desde || f.hasta);
}

export { isFlag };
