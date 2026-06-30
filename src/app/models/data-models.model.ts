export interface Sucursal {
  SucursalId: string; NombreSucursal: string; Direccion: string;
  LocalidadId: string; ProvinciaId: string; CodigoPostal: string;
  EstadoSucursalId: string; Email: string; Telefono: string;
  FechaApertura: string; Latitud: string; Longitud: string;
  CreatedAt: string; UpdatedAt: string; IsDeleted: string;
}
export interface Provincia {
  ProvinciaId: string; NombreProvincia: string; Region: string;
}
export interface Localidad {
  LocalidadId: string; ProvinciaId: string; NombreLocalidad: string;
}
export interface Distribuidor {
  DistribuidorId: string; NombreDistribuidor: string; IsDeleted: string;
}
export interface SucursalDistribuidor {
  SucursalDistribuidorId: string; SucursalId: string; DistribuidorId: string; EsPrincipal: string;
}
export interface SucursalSocialNetwork {
  SucursalSocialNetworkId: string; SucursalId: string; SocialNetworkId: string;
}
export interface EstadoSucursal {
  EstadoSucursalId: string; NombreEstadoSucursal: string;
}
export interface CompensationRequest {
  CompensationRequestId: string; SucursalId: string; UserId: string;
  CompensationRequestStateId: string; IsOpen: string; CreatedAt: string;
  ErrorId: string;
}
export interface CompensationRequestState {
  CompensationRequestStateId: string; NombreEstadoCompensacion: string;
}
export interface CompensationRequestError {
  CompensationRequestErrorId: string; CompensationRequestId: string; ErrorId: string;
}
export interface Error {
  ErrorId: string; ErrorName: string;
}
export interface Mail {
  MailId: string; SucursalId: string; UserId: string;
  Subject: string; MailStateId: string; RetryCount: string; CreatedAt: string;
}
export interface MailState {
  MailStateId: string; NombreEstadoMail: string;
}
export interface Monitoring {
  MonitoringId: string; UserId: string; AffectedTable: string;
  MonitoringActionId: string; CreatedAt: string;
}
export interface MonitoringAction {
  MonitoringActionId: string; NombreAccion: string;
}
export interface ProvinciaData {
  provinciaId: string;
  nombre: string; region: string; total: number; activas: number;
  inactivas: number; pendientes: number; sinCoord: number;
  sinSocial: number; sinDist: number;
  conDistCount: number; conSocialCount: number;
  pctActivas: number; pctCoberturaDist: number; pctCoberturaSocial: number;
  compAbiertas: number; compTotal: number;
  mailsTotal: number; mailsFallidos: number; pctMailsFallidos: number;
}
export interface CompMes { mes: string; total: number; abiertas: number; }
export interface MailMes { mes: string; total: number; fallidos: number; }
export interface AperturaMes { mes: string; total: number; }
export interface AuditMes { mes: string; [key: string]: number | string; }
export interface AuditTabla { tabla: string; [key: string]: number | string; }
export interface ErrorTipo { tipo: string; total: number; }
export interface MailAsunto { asunto: string; total: number; fallidos: number; }
export interface CompAging { b0_7: number; b8_30: number; b31plus: number; }
export interface DashboardTrends {
  compTotal: number; compAbiertas: number;
  mailsTotal: number; mailsFallidos: number; nuevasSucursales: number;
}
export interface SucursalGeo {
  id: string; nombre: string; lat: number; lng: number;
  estado: string; provincia: string; region: string;
  compAbiertas: number; mailsFallidos: number; riesgo: number;
  coordValida: boolean;
}
export interface SucursalIssue {
  id: string; nombre: string; provincia: string; estado: string;
  sinCoord: boolean; coordInvalida: boolean; sinDist: boolean; sinSocial: boolean;
}
export interface SucursalRow {
  id: string; nombre: string;
  provinciaId: string; provincia: string; region: string; localidad: string;
  estadoId: string; estado: string;
  email: string; telefono: string; direccion: string; codigoPostal: string; fechaApertura: string;
  lat: number | null; lng: number | null;
  coordValida: boolean; coordInvalida: boolean; sinCoord: boolean;
  tieneDist: boolean; tieneSocial: boolean;
  compTotal: number; compAbiertas: number; mailsTotal: number; mailsFallidos: number;
  riesgo: number; isDeleted: boolean;
}
export interface DashboardData {
  loading: boolean;
  totalSucursales: number; activas: number; inactivas: number; pendientes: number;
  pctActivas: number; sucConDist: number; pctCobDist: number;
  sucConSocial: number; pctCobSocial: number;
  totalComp: number; compAbiertas: number; compCerradas: number; pctCompAbiertas: number;
  compPendientes: number; compEnRevision: number; compAprobadas: number; compRechazadas: number;
  edadPromedioComp: number; totalErrores: number;
  compAging: CompAging;
  totalMails: number; mailsEnviados: number; mailsFallidos: number; pctMailsFallidos: number;
  reintentosSMTP: number;
  totalEventos: number; inserciones: number; actualizaciones: number;
  softDeletes: number; bulkInserts: number; bulkUpdates: number;
  scoreRiesgo: number; sinRedSocial: number; sinDistribuidor: number; sinCoordenadas: number;
  pctSinSocial: number; pctSinDist: number; pctSinCoord: number;
  provincias: ProvinciaData[];
  compPorMes: CompMes[];
  mailsPorMes: MailMes[];
  aperturasPorMes: AperturaMes[];
  trends: DashboardTrends;
  auditPorMes: AuditMes[];
  auditPorTabla: AuditTabla[];
  erroresPorTipo: ErrorTipo[];
  mailsPorAsunto: MailAsunto[];
  sucursalesGeo: SucursalGeo[];
  coordsInvalidas: number;
  sucursalesConProblemas: SucursalIssue[];
  sucursales: SucursalRow[];
}
