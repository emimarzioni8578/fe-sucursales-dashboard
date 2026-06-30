import type { ChartData, ChartType } from 'chart.js';
import { EstadoSucursal } from '@models/domain.constants';

/** Chart vacío tipado, usado como placeholder mientras los datos no llegaron. */
export const emptyChart = <T extends ChartType>(): ChartData<T> => ({ labels: [], datasets: [] });

/**
 * Tokens de color únicos para charts, KPIs y mapa.
 * Antes estaban hardcodeados (`#66bb6a`, `#ef5350`, …) y duplicados en cada
 * página y en el mapa; centralizarlos garantiza una paleta consistente.
 */
export const PALETTE = {
  blue: '#4fc3f7',
  green: '#66bb6a',
  orange: '#ffa726',
  red: '#ef5350',
  purple: '#ab47bc',
  teal: '#26a69a',
  grey: '#90a4ae',
} as const;

export type KpiColor = keyof typeof PALETTE;

/** Color semántico por estado de sucursal (usado en doughnut de estados y en el mapa). */
export const ESTADO_COLOR: Record<string, string> = {
  [EstadoSucursal.Activa]: PALETTE.green,
  [EstadoSucursal.Inactiva]: PALETTE.red,
  [EstadoSucursal.Pendiente]: PALETTE.orange,
};

/** Fallback para estados desconocidos en el mapa. */
export const ESTADO_COLOR_FALLBACK = PALETTE.grey;

/** Orden de colores para el doughnut de estados (Activas / Inactivas / Pendientes). */
export const ESTADO_SERIES_COLORS = [PALETTE.green, PALETTE.red, PALETTE.orange];

/** Colores para el doughnut de estados de compensación (Pendientes/En revisión/Aprobadas/Rechazadas). */
export const COMP_ESTADO_COLORS = [PALETTE.orange, PALETTE.blue, PALETTE.green, PALETTE.red];

/** Colores rotativos para barras de errores por tipo. */
export const ERROR_TIPO_COLORS = [PALETTE.blue, PALETTE.purple, PALETTE.orange];

/** Colores de las acciones de auditoría, alineados con AUDIT_ACTIONS. */
export const AUDIT_ACTION_COLORS = [
  PALETTE.green, PALETTE.orange, PALETTE.red, PALETTE.purple, PALETTE.blue, PALETTE.grey,
];

/** Series de acciones de auditoría: clave en los datos (minúscula) + etiqueta visible. */
export const AUDIT_ACTIONS: { key: string; label: string }[] = [
  { key: 'insert', label: 'Insert' },
  { key: 'update', label: 'Update' },
  { key: 'softdelete', label: 'SoftDelete' },
  { key: 'bulkinsert', label: 'BulkInsert' },
  { key: 'bulkupdate', label: 'BulkUpdate' },
  { key: 'delete', label: 'Delete' },
];
