import type {
  DashboardData, ProvinciaData, SucursalGeo, SucursalIssue,
  CompMes, MailMes, AperturaMes, AuditMes, AuditTabla, DashboardTrends,
} from '@models/data-models.model';
import { EstadoSucursal, CompEstado, MailEstado, MonitoringAccion, RATING_BAJO, isFlag } from '@models/domain.constants';
import { classifyCoord, hasCoordText } from './coords';
import { buildRatingHistogram, ratingAverage, type RatingAggregate } from './ratings';
import type { Lookups } from './lookups';
import type { FilteredData } from './filter';

/** Porcentaje a/b con `dp` decimales; 0 si el denominador es 0. */
export const pct = (a: number, b: number, dp = 1): number =>
  b ? +((a / b) * 100).toFixed(dp) : 0;

type BranchSummary = Pick<DashboardData,
  'totalSucursales' | 'activas' | 'inactivas' | 'pendientes' | 'pctActivas' |
  'sucConDist' | 'pctCobDist' | 'sucConSocial' | 'pctCobSocial'
> & { eliminadas: number };

export function computeBranchSummary(fd: FilteredData, lk: Lookups): BranchSummary {
  const { sucursales, sucDist, sucSocial } = fd;
  const totalSucursales = sucursales.length;

  let activas = 0, inactivas = 0, pendientes = 0, eliminadas = 0;
  sucursales.forEach(s => {
    const est = lk.estado.get(s.EstadoSucursalId);
    if (est === EstadoSucursal.Activa) activas++;
    else if (est === EstadoSucursal.Inactiva) inactivas++;
    else if (est === EstadoSucursal.Pendiente) pendientes++;
    if (isFlag(s.IsDeleted)) eliminadas++;
  });

  const sucConDist = new Set(sucDist.map(d => d.SucursalId)).size;
  const sucConSocial = new Set(sucSocial.map(s => s.SucursalId)).size;

  return {
    totalSucursales, activas, inactivas, pendientes, eliminadas,
    pctActivas: pct(activas, totalSucursales),
    sucConDist, pctCobDist: pct(sucConDist, totalSucursales),
    sucConSocial, pctCobSocial: pct(sucConSocial, totalSucursales),
  };
}

type Compensaciones = Pick<DashboardData,
  'totalComp' | 'compAbiertas' | 'compCerradas' | 'pctCompAbiertas' |
  'compPendientes' | 'compEnRevision' | 'compAprobadas' | 'compRechazadas' |
  'edadPromedioComp' | 'compAging' | 'totalErrores'
> & { compAbiertasBySuc: Map<string, number> };

export function computeCompensaciones(fd: FilteredData, lk: Lookups, now = Date.now()): Compensaciones {
  const { compReqs, compErrors } = fd;
  const totalComp = compReqs.length;
  const compAbiertas = compReqs.filter(c => isFlag(c.IsOpen)).length;

  let compPendientes = 0, compEnRevision = 0, compAprobadas = 0, compRechazadas = 0;
  compReqs.forEach(c => {
    const st = lk.compState.get(c.CompensationRequestStateId);
    if (st === CompEstado.Pending) compPendientes++;
    else if (st === CompEstado.InReview) compEnRevision++;
    else if (st === CompEstado.Approved) compAprobadas++;
    else if (st === CompEstado.Rejected) compRechazadas++;
  });

  // Aging de compensaciones abiertas.
  let sumDays = 0, countOpen = 0, b0_7 = 0, b8_30 = 0, b31plus = 0;
  const compAbiertasBySuc = new Map<string, number>();
  compReqs.filter(c => isFlag(c.IsOpen)).forEach(c => {
    const days = Math.floor((now - new Date(c.CreatedAt).getTime()) / 86400000);
    sumDays += days; countOpen++;
    if (days <= 7) b0_7++; else if (days <= 30) b8_30++; else b31plus++;
    compAbiertasBySuc.set(c.SucursalId, (compAbiertasBySuc.get(c.SucursalId) || 0) + 1);
  });

  return {
    totalComp, compAbiertas, compCerradas: totalComp - compAbiertas,
    pctCompAbiertas: pct(compAbiertas, totalComp),
    compPendientes, compEnRevision, compAprobadas, compRechazadas,
    edadPromedioComp: countOpen ? Math.round(sumDays / countOpen) : 0,
    compAging: { b0_7, b8_30, b31plus },
    totalErrores: compErrors.length,
    compAbiertasBySuc,
  };
}

type Mails = Pick<DashboardData,
  'totalMails' | 'mailsEnviados' | 'mailsFallidos' | 'pctMailsFallidos' | 'reintentosSMTP' | 'mailsPorAsunto'
> & { mailsFallidosBySuc: Map<string, number> };

export function computeMails(fd: FilteredData, lk: Lookups): Mails {
  const { mails } = fd;
  const totalMails = mails.length;
  let mailsEnviados = 0, mailsFallidos = 0, reintentosSMTP = 0;
  const mailsFallidosBySuc = new Map<string, number>();
  const asuntoMap = new Map<string, { total: number; fallidos: number }>();

  mails.forEach(m => {
    const st = lk.mailState.get(m.MailStateId);
    const failed = st === MailEstado.Failed;
    if (st === MailEstado.Sent) mailsEnviados++;
    else if (failed) {
      mailsFallidos++;
      mailsFallidosBySuc.set(m.SucursalId, (mailsFallidosBySuc.get(m.SucursalId) || 0) + 1);
    }
    reintentosSMTP += parseInt(m.RetryCount) || 0;

    const a = asuntoMap.get(m.Subject) || { total: 0, fallidos: 0 };
    a.total++; if (failed) a.fallidos++;
    asuntoMap.set(m.Subject, a);
  });

  return {
    totalMails, mailsEnviados, mailsFallidos,
    pctMailsFallidos: pct(mailsFallidos, totalMails),
    reintentosSMTP,
    mailsPorAsunto: [...asuntoMap.entries()].map(([asunto, v]) => ({ asunto, ...v })),
    mailsFallidosBySuc,
  };
}

type Auditoria = Pick<DashboardData,
  'totalEventos' | 'inserciones' | 'actualizaciones' | 'softDeletes' |
  'bulkInserts' | 'bulkUpdates' | 'auditPorMes' | 'auditPorTabla'
>;

export function computeAuditoria(fd: FilteredData, lk: Lookups): Auditoria {
  const { monitoring } = fd;
  let inserciones = 0, actualizaciones = 0, softDeletes = 0, bulkInserts = 0, bulkUpdates = 0;
  const porMes = new Map<string, AuditMes>();
  const porTabla = new Map<string, AuditTabla>();

  monitoring.forEach(m => {
    const ac = m.MonitoringActionId ? lk.monAction.get(m.MonitoringActionId) : undefined;
    if (ac === MonitoringAccion.Insert) inserciones++;
    else if (ac === MonitoringAccion.Update) actualizaciones++;
    else if (ac === MonitoringAccion.SoftDelete) softDeletes++;
    else if (ac === MonitoringAccion.BulkInsert) bulkInserts++;
    else if (ac === MonitoringAccion.BulkUpdate) bulkUpdates++;

    const mesKey = (m.CreatedAt || '').substring(0, 7);
    if (mesKey) {
      const row = porMes.get(mesKey) || ({ mes: mesKey } as AuditMes);
      if (ac) { const k = ac.toLowerCase(); row[k] = ((row[k] as number) || 0) + 1; }
      porMes.set(mesKey, row);
    }

    const tbl = m.AffectedTable;
    const row = porTabla.get(tbl) || ({ tabla: tbl } as AuditTabla);
    if (ac) { const k = ac.toLowerCase(); row[k] = ((row[k] as number) || 0) + 1; }
    porTabla.set(tbl, row);
  });

  return {
    totalEventos: monitoring.length,
    inserciones, actualizaciones, softDeletes, bulkInserts, bulkUpdates,
    auditPorMes: [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    auditPorTabla: [...porTabla.values()].sort((a, b) => a.tabla.localeCompare(b.tabla)),
  };
}

export function computeGeo(
  fd: FilteredData, lk: Lookups,
  compAbiertasBySuc: Map<string, number>, mailsFallidosBySuc: Map<string, number>,
  ratingBySuc: Map<string, RatingAggregate>,
): Pick<DashboardData, 'sucursalesGeo' | 'coordsInvalidas'> {
  let coordsInvalidas = 0;
  const sucursalesGeo: SucursalGeo[] = [];
  fd.sucursales.forEach(s => {
    const coord = classifyCoord(s.Latitud, s.Longitud);
    if (!coord.hasCoord) return;
    if (coord.coordInvalida) coordsInvalidas++;
    const ca = compAbiertasBySuc.get(s.SucursalId) || 0;
    const mf = mailsFallidosBySuc.get(s.SucursalId) || 0;
    const rating = ratingBySuc.get(s.SucursalId) || { sum: 0, count: 0 };
    sucursalesGeo.push({
      id: s.SucursalId, nombre: s.NombreSucursal, lat: coord.lat!, lng: coord.lng!,
      estado: lk.estado.get(s.EstadoSucursalId) || 'Desconocido',
      provincia: lk.provincia.get(s.ProvinciaId) || '—',
      region: lk.provinciaRegion.get(s.ProvinciaId) || '—',
      compAbiertas: ca, mailsFallidos: mf,
      riesgo: ca * 2 + mf + (isFlag(s.IsDeleted) ? 5 : 0),
      coordValida: coord.coordValida,
      ratingAverage: ratingAverage(rating.sum, rating.count), ratingCount: rating.count,
    });
  });
  return { sucursalesGeo, coordsInvalidas };
}

type Ratings = Pick<DashboardData,
  'ratingPromedioRed' | 'ratingVotos' | 'sucCalificadas' | 'pctCalificadas' | 'ratingBajas' | 'ratingDistribucion'
>;

/** Scoring agregado de la red: promedio exacto sobre todos los votos, cobertura e histograma. */
export function computeRatings(fd: FilteredData, ratingBySuc: Map<string, RatingAggregate>): Ratings {
  let sum = 0, count = 0, ratingBajas = 0;
  ratingBySuc.forEach(agg => {
    sum += agg.sum;
    count += agg.count;
    const avg = ratingAverage(agg.sum, agg.count);
    if (avg !== null && avg < RATING_BAJO) ratingBajas++;
  });
  return {
    ratingPromedioRed: ratingAverage(sum, count),
    ratingVotos: count,
    sucCalificadas: ratingBySuc.size,
    pctCalificadas: pct(ratingBySuc.size, fd.sucursales.length),
    ratingBajas,
    ratingDistribucion: buildRatingHistogram(fd.ratings),
  };
}

export function computeIssues(fd: FilteredData, lk: Lookups): Pick<DashboardData, 'sucursalesConProblemas'> {
  const distSet = new Set(fd.sucDist.map(d => d.SucursalId));
  const socialSet = new Set(fd.sucSocial.map(s => s.SucursalId));
  const sucursalesConProblemas: SucursalIssue[] = [];
  fd.sucursales.forEach(s => {
    const coord = classifyCoord(s.Latitud, s.Longitud);
    const sinDist = !distSet.has(s.SucursalId);
    const sinSocial = !socialSet.has(s.SucursalId);
    if (coord.sinCoord || coord.coordInvalida || sinDist || sinSocial) {
      sucursalesConProblemas.push({
        id: s.SucursalId, nombre: s.NombreSucursal,
        provincia: lk.provincia.get(s.ProvinciaId) || '—',
        estado: lk.estado.get(s.EstadoSucursalId) || 'Desconocido',
        sinCoord: coord.sinCoord, coordInvalida: coord.coordInvalida, sinDist, sinSocial,
      });
    }
  });
  return { sucursalesConProblemas };
}

interface ProvAccum {
  nombre: string; region: string;
  total: number; activas: number; inactivas: number; pendientes: number;
  sinCoord: number; conDist: Set<string>; conSocial: Set<string>;
  compTotal: number; compAbiertas: number; mailsTotal: number; mailsFallidos: number;
  ratingSum: number; ratingVotos: number; sucCalificadas: number;
}

export function computeProvincias(
  fd: FilteredData, lk: Lookups, ratingBySuc: Map<string, RatingAggregate>,
): Pick<DashboardData, 'provincias'> {
  const { sucursales, sucDist, sucSocial, compReqs, mails } = fd;
  const acc = new Map<string, ProvAccum>();
  lk.provincia.forEach((nombre, id) => {
    acc.set(id, {
      nombre, region: lk.provinciaRegion.get(id) || '—',
      total: 0, activas: 0, inactivas: 0, pendientes: 0,
      sinCoord: 0, conDist: new Set(), conSocial: new Set(),
      compTotal: 0, compAbiertas: 0, mailsTotal: 0, mailsFallidos: 0,
      ratingSum: 0, ratingVotos: 0, sucCalificadas: 0,
    });
  });

  sucursales.forEach(s => {
    const d = acc.get(s.ProvinciaId); if (!d) return;
    d.total++;
    const est = lk.estado.get(s.EstadoSucursalId);
    if (est === EstadoSucursal.Activa) d.activas++;
    else if (est === EstadoSucursal.Inactiva) d.inactivas++;
    else if (est === EstadoSucursal.Pendiente) d.pendientes++;
    if (!hasCoordText(s)) d.sinCoord++;
  });
  new Set(sucDist.map(d => d.SucursalId)).forEach(sid => {
    const d = acc.get(lk.sucProvincia.get(sid)!); if (d) d.conDist.add(sid);
  });
  new Set(sucSocial.map(s => s.SucursalId)).forEach(sid => {
    const d = acc.get(lk.sucProvincia.get(sid)!); if (d) d.conSocial.add(sid);
  });
  compReqs.forEach(c => {
    const d = acc.get(lk.sucProvincia.get(c.SucursalId)!); if (!d) return;
    d.compTotal++; if (isFlag(c.IsOpen)) d.compAbiertas++;
  });
  mails.forEach(m => {
    const d = acc.get(lk.sucProvincia.get(m.SucursalId)!); if (!d) return;
    d.mailsTotal++; if (lk.mailState.get(m.MailStateId) === MailEstado.Failed) d.mailsFallidos++;
  });
  ratingBySuc.forEach((agg, sid) => {
    const d = acc.get(lk.sucProvincia.get(sid)!); if (!d) return;
    d.ratingSum += agg.sum; d.ratingVotos += agg.count; d.sucCalificadas++;
  });

  const provincias: ProvinciaData[] = [];
  acc.forEach((d, provinciaId) => {
    if (d.total === 0) return; // ocultar provincias vacías cuando hay filtro
    provincias.push({
      provinciaId, nombre: d.nombre, region: d.region,
      total: d.total, activas: d.activas, inactivas: d.inactivas, pendientes: d.pendientes,
      sinCoord: d.sinCoord, sinSocial: d.total - d.conSocial.size, sinDist: d.total - d.conDist.size,
      conDistCount: d.conDist.size, conSocialCount: d.conSocial.size,
      pctActivas: pct(d.activas, d.total), pctCoberturaDist: pct(d.conDist.size, d.total),
      pctCoberturaSocial: pct(d.conSocial.size, d.total),
      compAbiertas: d.compAbiertas, compTotal: d.compTotal,
      mailsTotal: d.mailsTotal, mailsFallidos: d.mailsFallidos, pctMailsFallidos: pct(d.mailsFallidos, d.mailsTotal),
      ratingAverage: ratingAverage(d.ratingSum, d.ratingVotos), ratingVotos: d.ratingVotos,
      sucCalificadas: d.sucCalificadas, pctCalificadas: pct(d.sucCalificadas, d.total),
    });
  });
  provincias.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { provincias };
}

export function computeSeries(fd: FilteredData, lk: Lookups): Pick<DashboardData,
  'compPorMes' | 'mailsPorMes' | 'aperturasPorMes' | 'trends'
> {
  const { compReqs, mails, sucursales } = fd;

  const compMap = new Map<string, CompMes>();
  compReqs.forEach(c => {
    const key = (c.CreatedAt || '').substring(0, 7); if (!key) return;
    const d = compMap.get(key) || { mes: key, total: 0, abiertas: 0 };
    d.total++; if (isFlag(c.IsOpen)) d.abiertas++;
    compMap.set(key, d);
  });
  const compPorMes = [...compMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

  const mailMap = new Map<string, MailMes>();
  mails.forEach(m => {
    const key = (m.CreatedAt || '').substring(0, 7); if (!key) return;
    const d = mailMap.get(key) || { mes: key, total: 0, fallidos: 0 };
    d.total++; if (lk.mailState.get(m.MailStateId) === MailEstado.Failed) d.fallidos++;
    mailMap.set(key, d);
  });
  const mailsPorMes = [...mailMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

  const aperturaMap = new Map<string, AperturaMes>();
  sucursales.forEach(s => {
    const key = (s.FechaApertura || '').substring(0, 7); if (!key) return;
    const d = aperturaMap.get(key) || { mes: key, total: 0 };
    d.total++;
    aperturaMap.set(key, d);
  });
  const aperturasPorMes = [...aperturaMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

  const momPct = <T extends { mes: string }>(arr: T[], sel: (x: T) => number): number => {
    const n = arr.length; if (n < 2) return 0;
    const cur = sel(arr[n - 1]), prev = sel(arr[n - 2]);
    return prev ? +(((cur - prev) / prev) * 100).toFixed(1) : (cur ? 100 : 0);
  };
  const trends: DashboardTrends = {
    compTotal: momPct(compPorMes, x => x.total),
    compAbiertas: momPct(compPorMes, x => x.abiertas),
    mailsTotal: momPct(mailsPorMes, x => x.total),
    mailsFallidos: momPct(mailsPorMes, x => x.fallidos),
    nuevasSucursales: momPct(aperturasPorMes, x => x.total),
  };

  return { compPorMes, mailsPorMes, aperturasPorMes, trends };
}

export function computeErroresPorTipo(fd: FilteredData, lk: Lookups): Pick<DashboardData, 'erroresPorTipo'> {
  const errCount = new Map<string, number>();
  fd.compErrors.forEach(e => {
    const name = e.ErrorId ? (lk.error.get(e.ErrorId) || 'Unknown') : 'Unknown';
    errCount.set(name, (errCount.get(name) || 0) + 1);
  });
  return { erroresPorTipo: [...errCount.entries()].map(([tipo, total]) => ({ tipo, total })) };
}
