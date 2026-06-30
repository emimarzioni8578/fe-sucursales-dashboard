import type {
  Sucursal, Provincia, Localidad, Distribuidor, SucursalDistribuidor,
  SucursalSocialNetwork, EstadoSucursal, CompensationRequest, CompensationRequestState,
  CompensationRequestError, Error as ErrorRow, Mail, MailState, Monitoring, MonitoringAction,
} from '@models/data-models.model';

/** Todas las tablas CSV crudas, ya parseadas. */
export interface RawData {
  sucursales: Sucursal[];
  provincias: Provincia[];
  localidades: Localidad[];
  distribuidores: Distribuidor[];
  sucDist: SucursalDistribuidor[];
  sucSocial: SucursalSocialNetwork[];
  estados: EstadoSucursal[];
  compReqs: CompensationRequest[];
  compStates: CompensationRequestState[];
  compErrors: CompensationRequestError[];
  errors: ErrorRow[];
  mails: Mail[];
  mailStates: MailState[];
  monitoring: Monitoring[];
  monActions: MonitoringAction[];
}

/**
 * Índices id→nombre derivados de `RawData`. Son invariantes tras la carga,
 * por eso se construyen una sola vez y se reutilizan en cada recálculo de filtro
 * (antes se reconstruían en cada emisión, dentro de `computeDashboard`).
 */
export interface Lookups {
  estado: Map<string, string>;          // EstadoSucursalId -> NombreEstadoSucursal
  provincia: Map<string, string>;       // ProvinciaId -> NombreProvincia
  provinciaRegion: Map<string, string>; // ProvinciaId -> Region
  localidad: Map<string, string>;       // LocalidadId -> NombreLocalidad
  compState: Map<string, string>;       // CompensationRequestStateId -> Nombre
  mailState: Map<string, string>;       // MailStateId -> NombreEstadoMail
  monAction: Map<string, string>;       // MonitoringActionId -> NombreAccion
  error: Map<string, string>;           // ErrorId -> ErrorName
  sucProvincia: Map<string, string>;    // SucursalId -> ProvinciaId
}

export function buildLookups(r: RawData): Lookups {
  return {
    estado: new Map(r.estados.map(e => [e.EstadoSucursalId, e.NombreEstadoSucursal])),
    provincia: new Map(r.provincias.map(p => [p.ProvinciaId, p.NombreProvincia])),
    provinciaRegion: new Map(r.provincias.map(p => [p.ProvinciaId, p.Region])),
    localidad: new Map(r.localidades.map(l => [l.LocalidadId, l.NombreLocalidad])),
    compState: new Map(r.compStates.map(s => [s.CompensationRequestStateId, s.NombreEstadoCompensacion])),
    mailState: new Map(r.mailStates.map(s => [s.MailStateId, s.NombreEstadoMail])),
    monAction: new Map(r.monActions.map(a => [a.MonitoringActionId, a.NombreAccion])),
    error: new Map(r.errors.map(e => [e.ErrorId, e.ErrorName])),
    sucProvincia: new Map(r.sucursales.map(s => [s.SucursalId, s.ProvinciaId])),
  };
}
