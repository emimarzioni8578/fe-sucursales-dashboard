import type { Params } from '@angular/router';
import type { DashboardFilter } from './dashboard-source';
import { EMPTY_FILTER } from './aggregations';

/** Claves del filtro que se reflejan en la query string, en orden estable. */
const KEYS = ['provincia', 'region', 'estado', 'desde', 'hasta'] as const;

/** Serializa el filtro a query params. Omite las claves nulas para no ensuciar la URL. */
export function filterToParams(f: DashboardFilter): Params {
  const params: Params = {};
  for (const k of KEYS) {
    const v = f[k];
    if (v) params[k] = v;
  }
  return params;
}

/** Reconstruye un filtro completo a partir de query params (claves ausentes → null). */
export function paramsToFilter(params: Params): DashboardFilter {
  const f: DashboardFilter = { ...EMPTY_FILTER };
  for (const k of KEYS) {
    const v = params[k];
    if (typeof v === 'string' && v) f[k] = v;
  }
  return f;
}

/** Clave canónica de un filtro; permite comparar dos filtros para evitar loops de sincronización. */
export function filterKey(f: DashboardFilter): string {
  return KEYS.map(k => f[k] ?? '').join('|');
}
