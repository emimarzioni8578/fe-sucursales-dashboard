import type { SucursalRow } from '@models/data-models.model';

/**
 * Top-N sucursales por score de riesgo (descendente). Excluye las de riesgo 0
 * para que la lista destaque solo lo accionable. Desempata por compensaciones
 * abiertas y, en última instancia, por id (orden estable).
 *
 * Opera sobre una copia (`filter` ya devuelve un array nuevo), así que no muta
 * el `sucursales` de `DashboardData` que consume la tabla de Sucursales.
 */
export function topRiesgo(sucursales: SucursalRow[], n = 10): SucursalRow[] {
  return sucursales
    .filter(s => s.riesgo > 0)
    .sort((a, b) => b.riesgo - a.riesgo || b.compAbiertas - a.compAbiertas || a.id.localeCompare(b.id))
    .slice(0, n);
}
