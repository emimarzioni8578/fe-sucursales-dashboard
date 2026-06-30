/**
 * Valores canónicos del dominio tal como vienen en los CSV.
 * Centralizarlos evita comparar contra strings sueltos ("Activa", "Failed", …)
 * dispersos por el servicio y las páginas: si cambia la grafía en el origen,
 * se ajusta acá y el compilador marca los usos.
 */

/** Estados de sucursal (`estado_sucursal.NombreEstadoSucursal`). */
export const EstadoSucursal = {
  Activa: 'Activa',
  Inactiva: 'Inactiva',
  Pendiente: 'Pendiente',
} as const;
export type EstadoSucursalNombre = (typeof EstadoSucursal)[keyof typeof EstadoSucursal];

/** Estados de compensación (`compensation_request_states.NombreEstadoCompensacion`). */
export const CompEstado = {
  Pending: 'Pending',
  InReview: 'InReview',
  Approved: 'Approved',
  Rejected: 'Rejected',
} as const;
export type CompEstadoNombre = (typeof CompEstado)[keyof typeof CompEstado];

/** Estados de mail (`mail_states.NombreEstadoMail`). */
export const MailEstado = {
  Sent: 'Sent',
  Failed: 'Failed',
} as const;
export type MailEstadoNombre = (typeof MailEstado)[keyof typeof MailEstado];

/** Acciones de auditoría (`monitoring_actions.NombreAccion`). */
export const MonitoringAccion = {
  Insert: 'Insert',
  Update: 'Update',
  SoftDelete: 'SoftDelete',
  BulkInsert: 'BulkInsert',
  BulkUpdate: 'BulkUpdate',
  Delete: 'Delete',
} as const;
export type MonitoringAccionNombre = (typeof MonitoringAccion)[keyof typeof MonitoringAccion];

/** Flag booleano serializado como texto en los CSV (`IsOpen`, `IsDeleted`). */
export const FLAG_TRUE = '1';
export const isFlag = (value: string | undefined | null): boolean => value === FLAG_TRUE;

/** Bounding box aproximado de Argentina continental para validar coordenadas. */
export const AR_BOUNDS = { latMin: -55.1, latMax: -21.7, lngMin: -73.6, lngMax: -53.6 } as const;
