import type { Observable } from 'rxjs';
import type { DashboardData, SucursalRow } from '@models/data-models.model';
import type { DashboardFilter, FilterOptions } from './aggregations';

export type DashboardStatus = 'loading' | 'ready' | 'error';
export interface DashboardState {
  status: DashboardStatus;
  data: DashboardData | null;
  error: string | null;
}

// Re-exportados para que los consumidores tipen filtros/opciones sin conocer la implementación.
export type { DashboardFilter, FilterOptions };

/**
 * Contrato de la fuente de datos del dashboard. Las páginas y componentes dependen
 * de esta abstracción, no de una implementación concreta. Hoy la resuelve
 * `CsvDashboardService` (carga y agrega CSVs en el cliente); el día que exista la
 * API contra SQL Server se cambia el provider a `ApiDashboardService` sin tocar la UI.
 *
 * `DashboardData` es, además, el contrato del DTO que esa API deberá devolver.
 */
export abstract class DashboardSource {
  /** Estado del shell: loading / ready / error. Emite 'loading' y luego el resultado. */
  abstract readonly state$: Observable<DashboardState>;
  /** Datos computados del dashboard; re-emite ante cada cambio del filtro activo. */
  abstract readonly data$: Observable<DashboardData>;
  /** Opciones para poblar los controles del filtro global. */
  abstract readonly filterOptions$: Observable<FilterOptions>;
  /** Filtro global activo. */
  abstract readonly activeFilter$: Observable<DashboardFilter>;

  /** Aplica un patch parcial al filtro global. */
  abstract setFilter(patch: Partial<DashboardFilter>): void;
  /** Limpia el filtro global. */
  abstract clearFilter(): void;
  /** ¿Hay al menos un criterio de filtro activo? */
  abstract get hasActiveFilter(): boolean;
  /** Reintenta la carga de datos (p. ej. tras una falla transitoria). */
  abstract reload(): void;

  /** Búsqueda libre sobre todas las sucursales (ignora el filtro activo). */
  abstract searchSucursales(term: string, limit?: number): SucursalRow[];
  /** Busca una sucursal por id. */
  abstract getSucursal(id: string): SucursalRow | undefined;
}
