import type { SucursalRow } from '@models/data-models.model';
import { MailEstado, isFlag } from '@models/domain.constants';
import { classifyCoord } from './coords';
import type { Lookups, RawData } from './lookups';

/**
 * Construye la lista completa de filas de detalle por sucursal (sin filtrar).
 * Alimenta la búsqueda, el diálogo de detalle y la tabla de sucursales.
 * Es independiente del filtro, por eso se memoiza una sola vez.
 */
export function buildSucursalRows(r: RawData, lk: Lookups): SucursalRow[] {
  const distSet = new Set(r.sucDist.map(d => d.SucursalId));
  const socialSet = new Set(r.sucSocial.map(s => s.SucursalId));

  const compBySuc = new Map<string, { total: number; abiertas: number }>();
  r.compReqs.forEach(c => {
    const d = compBySuc.get(c.SucursalId) || { total: 0, abiertas: 0 };
    d.total++;
    if (isFlag(c.IsOpen)) d.abiertas++;
    compBySuc.set(c.SucursalId, d);
  });

  const mailBySuc = new Map<string, { total: number; fallidos: number }>();
  r.mails.forEach(m => {
    const d = mailBySuc.get(m.SucursalId) || { total: 0, fallidos: 0 };
    d.total++;
    if (lk.mailState.get(m.MailStateId) === MailEstado.Failed) d.fallidos++;
    mailBySuc.set(m.SucursalId, d);
  });

  return r.sucursales.map(s => {
    const coord = classifyCoord(s.Latitud, s.Longitud);
    const comp = compBySuc.get(s.SucursalId) || { total: 0, abiertas: 0 };
    const mail = mailBySuc.get(s.SucursalId) || { total: 0, fallidos: 0 };
    const isDeleted = isFlag(s.IsDeleted);
    return {
      id: s.SucursalId, nombre: s.NombreSucursal,
      provinciaId: s.ProvinciaId, provincia: lk.provincia.get(s.ProvinciaId) || '—',
      region: lk.provinciaRegion.get(s.ProvinciaId) || '—', localidad: lk.localidad.get(s.LocalidadId) || '—',
      estadoId: s.EstadoSucursalId, estado: lk.estado.get(s.EstadoSucursalId) || 'Desconocido',
      email: s.Email, telefono: s.Telefono, direccion: s.Direccion, codigoPostal: s.CodigoPostal,
      fechaApertura: s.FechaApertura,
      lat: coord.lat, lng: coord.lng,
      coordValida: coord.coordValida, coordInvalida: coord.coordInvalida, sinCoord: coord.sinCoord,
      tieneDist: distSet.has(s.SucursalId), tieneSocial: socialSet.has(s.SucursalId),
      compTotal: comp.total, compAbiertas: comp.abiertas, mailsTotal: mail.total, mailsFallidos: mail.fallidos,
      riesgo: comp.abiertas * 2 + mail.fallidos + (isDeleted ? 5 : 0), isDeleted,
    };
  });
}
