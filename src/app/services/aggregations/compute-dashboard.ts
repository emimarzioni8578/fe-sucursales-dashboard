import type { DashboardData, SucursalRow } from '@models/data-models.model';
import type { Lookups, RawData } from './lookups';
import { applyFilter, rowMatches, type DashboardFilter } from './filter';
import { buildRatingIndex } from './ratings';
import {
  pct, computeBranchSummary, computeCompensaciones, computeMails, computeAuditoria,
  computeGeo, computeIssues, computeProvincias, computeRatings, computeSeries, computeErroresPorTipo,
} from './sections';

/**
 * Orquesta todos los agregadores puros para producir un `DashboardData` completo
 * a partir de los datos crudos, los lookups memoizados, las filas de detalle y el
 * filtro activo. Cada sección es independiente y testeable por separado.
 */
export function computeDashboard(
  r: RawData, lk: Lookups, allRows: SucursalRow[], f: DashboardFilter,
): DashboardData {
  const fd = applyFilter(r, lk, f);

  const ratingBySuc = buildRatingIndex(fd.ratings);
  const branch = computeBranchSummary(fd, lk);
  const comp = computeCompensaciones(fd, lk);
  const mail = computeMails(fd, lk);
  const audit = computeAuditoria(fd, lk);
  const geo = computeGeo(fd, lk, comp.compAbiertasBySuc, mail.mailsFallidosBySuc, ratingBySuc);
  const issues = computeIssues(fd, lk);
  const { provincias } = computeProvincias(fd, lk, ratingBySuc);
  const ratings = computeRatings(fd, ratingBySuc);
  const series = computeSeries(fd, lk);
  const errores = computeErroresPorTipo(fd, lk);

  const pctSoftDelete = pct(branch.eliminadas, branch.totalSucursales, 2);
  const scoreRiesgo = +(0.4 * mail.pctMailsFallidos + 0.4 * comp.pctCompAbiertas + 0.2 * pctSoftDelete).toFixed(2);

  const sinRedSocial = provincias.reduce((s, p) => s + p.sinSocial, 0);
  const sinDistribuidor = provincias.reduce((s, p) => s + p.sinDist, 0);
  const sinCoordenadas = provincias.reduce((s, p) => s + p.sinCoord, 0);

  return {
    loading: false,
    totalSucursales: branch.totalSucursales,
    activas: branch.activas, inactivas: branch.inactivas, pendientes: branch.pendientes,
    pctActivas: branch.pctActivas,
    sucConDist: branch.sucConDist, pctCobDist: branch.pctCobDist,
    sucConSocial: branch.sucConSocial, pctCobSocial: branch.pctCobSocial,

    totalComp: comp.totalComp, compAbiertas: comp.compAbiertas, compCerradas: comp.compCerradas,
    pctCompAbiertas: comp.pctCompAbiertas,
    compPendientes: comp.compPendientes, compEnRevision: comp.compEnRevision,
    compAprobadas: comp.compAprobadas, compRechazadas: comp.compRechazadas,
    edadPromedioComp: comp.edadPromedioComp, totalErrores: comp.totalErrores, compAging: comp.compAging,

    totalMails: mail.totalMails, mailsEnviados: mail.mailsEnviados, mailsFallidos: mail.mailsFallidos,
    pctMailsFallidos: mail.pctMailsFallidos, reintentosSMTP: mail.reintentosSMTP,

    totalEventos: audit.totalEventos, inserciones: audit.inserciones, actualizaciones: audit.actualizaciones,
    softDeletes: audit.softDeletes, bulkInserts: audit.bulkInserts, bulkUpdates: audit.bulkUpdates,

    scoreRiesgo, sinRedSocial, sinDistribuidor, sinCoordenadas,
    pctSinSocial: pct(sinRedSocial, branch.totalSucursales),
    pctSinDist: pct(sinDistribuidor, branch.totalSucursales),
    pctSinCoord: pct(sinCoordenadas, branch.totalSucursales),

    ratingPromedioRed: ratings.ratingPromedioRed, ratingVotos: ratings.ratingVotos,
    sucCalificadas: ratings.sucCalificadas, pctCalificadas: ratings.pctCalificadas,
    ratingBajas: ratings.ratingBajas, ratingDistribucion: ratings.ratingDistribucion,

    provincias,
    compPorMes: series.compPorMes, mailsPorMes: series.mailsPorMes,
    aperturasPorMes: series.aperturasPorMes, trends: series.trends,
    auditPorMes: audit.auditPorMes, auditPorTabla: audit.auditPorTabla,
    erroresPorTipo: errores.erroresPorTipo, mailsPorAsunto: mail.mailsPorAsunto,
    sucursalesGeo: geo.sucursalesGeo, coordsInvalidas: geo.coordsInvalidas,
    sucursalesConProblemas: issues.sucursalesConProblemas,
    sucursales: allRows.filter(row => rowMatches(row, f)),
  };
}
