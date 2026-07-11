import {
  computeAuditoria, computeBranchSummary, computeErroresPorTipo, computeGeo,
  computeMails, computeProvincias, computeRatings, computeSeries,
} from './sections';
import { buildLookups, type RawData } from './lookups';
import { applyFilter, EMPTY_FILTER, type FilteredData } from './filter';
import { buildRatingIndex } from './ratings';
import type { Lookups } from './lookups';
import { makeRawData, makeRawSucursal } from '@testing/mocks';

/** Universo filtrado con filtro vacío: el camino que recorre computeDashboard. */
function fixture(partial: Partial<RawData> = {}): { fd: FilteredData; lk: Lookups } {
  const r = makeRawData(partial);
  const lk = buildLookups(r);
  return { fd: applyFilter(r, lk, EMPTY_FILTER), lk };
}

describe('computeBranchSummary', () => {
  it('ignores unknown estados in the state buckets but counts them in the total', () => {
    const { fd, lk } = fixture({
      sucursales: [
        makeRawSucursal({ SucursalId: 'S1', EstadoSucursalId: '1' }),
        makeRawSucursal({ SucursalId: 'S2', EstadoSucursalId: '99' }), // estado no catalogado
      ],
    });
    const b = computeBranchSummary(fd, lk);
    expect(b.totalSucursales).toBe(2);
    expect(b.activas + b.inactivas + b.pendientes).toBe(1);
  });
});

describe('computeSeries (trends)', () => {
  it('returns 0 trends with fewer than two months of data', () => {
    const { fd, lk } = fixture({
      compReqs: [{ CompensationRequestId: 'C1', SucursalId: 'S1', UserId: 'U1', CompensationRequestStateId: '1', IsOpen: '1', CreatedAt: '2026-01-05', ErrorId: '' }],
      sucursales: [makeRawSucursal()],
    });
    const { trends } = computeSeries(fd, lk);
    expect(trends.compTotal).toBe(0);
    expect(trends.nuevasSucursales).toBe(0);
  });

  it('treats growth from a zero month as +100% (not NaN/Infinity)', () => {
    const { fd, lk } = fixture({
      mails: [
        // Enero: 1 mail Sent (0 fallidos) · Febrero: 1 mail Failed → fallidos 0 → 1
        { MailId: 'M1', SucursalId: 'S1', UserId: 'U1', Subject: 'A', MailStateId: '1', RetryCount: '0', CreatedAt: '2026-01-10' },
        { MailId: 'M2', SucursalId: 'S1', UserId: 'U1', Subject: 'A', MailStateId: '2', RetryCount: '0', CreatedAt: '2026-02-10' },
      ],
      sucursales: [makeRawSucursal()],
    });
    const { trends } = computeSeries(fd, lk);
    expect(trends.mailsFallidos).toBe(100);
    expect(trends.mailsTotal).toBe(0); // 1 → 1
  });

  it('skips records without a date instead of inventing a bucket', () => {
    const { fd, lk } = fixture({
      compReqs: [
        { CompensationRequestId: 'C1', SucursalId: 'S1', UserId: 'U1', CompensationRequestStateId: '1', IsOpen: '0', CreatedAt: '', ErrorId: '' },
      ],
      sucursales: [makeRawSucursal({ FechaApertura: '' })],
    });
    const s = computeSeries(fd, lk);
    expect(s.compPorMes).toEqual([]);
    expect(s.aperturasPorMes).toEqual([]);
  });
});

describe('computeMails', () => {
  it('treats non-numeric RetryCount as 0 retries', () => {
    const { fd, lk } = fixture({
      mails: [{ MailId: 'M1', SucursalId: 'S1', UserId: 'U1', Subject: 'A', MailStateId: '1', RetryCount: 'nope', CreatedAt: '2026-01-10' }],
      sucursales: [makeRawSucursal()],
    });
    expect(computeMails(fd, lk).reintentosSMTP).toBe(0);
  });
});

describe('computeAuditoria', () => {
  it('counts action-less events in the total without inventing an action bucket', () => {
    const { fd, lk } = fixture({
      monitoring: [
        { MonitoringId: 'MO1', UserId: 'U1', AffectedTable: 'sucursales', MonitoringActionId: '', CreatedAt: '2026-01-10' },
        { MonitoringId: 'MO2', UserId: 'U1', AffectedTable: 'sucursales', MonitoringActionId: '1', CreatedAt: '2026-01-11' },
      ],
    });
    const a = computeAuditoria(fd, lk);
    expect(a.totalEventos).toBe(2);
    expect(a.inserciones).toBe(1);
    expect(a.auditPorTabla).toEqual([{ tabla: 'sucursales', insert: 1 }]);
  });

  it('excludes undated events from the per-month series but not from totals', () => {
    const { fd, lk } = fixture({
      monitoring: [{ MonitoringId: 'MO1', UserId: 'U1', AffectedTable: 'mails', MonitoringActionId: '2', CreatedAt: '' }],
    });
    const a = computeAuditoria(fd, lk);
    expect(a.totalEventos).toBe(1);
    expect(a.actualizaciones).toBe(1);
    expect(a.auditPorMes).toEqual([]);
  });
});

describe('computeErroresPorTipo', () => {
  it('maps missing and uncataloged error ids to "Unknown"', () => {
    const { fd, lk } = fixture({
      compReqs: [
        { CompensationRequestId: 'C1', SucursalId: 'S1', UserId: 'U1', CompensationRequestStateId: '1', IsOpen: '1', CreatedAt: '2026-01-05', ErrorId: '' },
      ],
      compErrors: [
        { CompensationRequestErrorId: 'CE1', CompensationRequestId: 'C1', ErrorId: '' },
        { CompensationRequestErrorId: 'CE2', CompensationRequestId: 'C1', ErrorId: 'EX' },
        { CompensationRequestErrorId: 'CE3', CompensationRequestId: 'C1', ErrorId: 'E1' },
      ],
      sucursales: [makeRawSucursal()],
    });
    const e = computeErroresPorTipo(fd, lk);
    expect(e.erroresPorTipo).toContainEqual({ tipo: 'Unknown', total: 2 });
    expect(e.erroresPorTipo).toContainEqual({ tipo: 'Timeout', total: 1 });
  });
});

describe('computeGeo', () => {
  it('excludes coordinate-less branches, flags out-of-bounds ones and falls back on unknown estado/provincia', () => {
    const { fd, lk } = fixture({
      sucursales: [
        makeRawSucursal({ SucursalId: 'S1', Latitud: '', Longitud: '' }),
        makeRawSucursal({ SucursalId: 'S2', Latitud: '10', Longitud: '10', EstadoSucursalId: '99', ProvinciaId: 'P9' }),
      ],
    });
    const geo = computeGeo(fd, lk, new Map(), new Map(), new Map());
    expect(geo.sucursalesGeo.map(g => g.id)).toEqual(['S2']);
    expect(geo.coordsInvalidas).toBe(1);
    expect(geo.sucursalesGeo[0]).toMatchObject({ estado: 'Desconocido', provincia: '—', ratingAverage: null, ratingCount: 0 });
  });
});

describe('computeRatings', () => {
  it('returns null average and an all-zero histogram without votes', () => {
    const { fd } = fixture({ sucursales: [makeRawSucursal()] });
    const r = computeRatings(fd, buildRatingIndex(fd.ratings));
    expect(r).toEqual({
      ratingPromedioRed: null, ratingVotos: 0, sucCalificadas: 0,
      pctCalificadas: 0, ratingBajas: 0, ratingDistribucion: [0, 0, 0, 0, 0],
    });
  });

  it('computes the exact network average and counts low-rated branches', () => {
    const { fd } = fixture({
      sucursales: [makeRawSucursal({ SucursalId: 'S1' }), makeRawSucursal({ SucursalId: 'S2' })],
      ratings: [
        { SucursalRatingId: '1', SucursalId: 'S1', UserId: 'U1', Score: '5', CreatedAt: '2026-01-01', UpdatedAt: '2026-01-01' },
        { SucursalRatingId: '2', SucursalId: 'S2', UserId: 'U1', Score: '2', CreatedAt: '2026-01-01', UpdatedAt: '2026-01-01' },
      ],
    });
    const r = computeRatings(fd, buildRatingIndex(fd.ratings));
    expect(r.ratingPromedioRed).toBe(3.5);
    expect(r.sucCalificadas).toBe(2);
    expect(r.pctCalificadas).toBe(100);
    expect(r.ratingBajas).toBe(1); // S2 con 2★
    expect(r.ratingDistribucion).toEqual([0, 1, 0, 0, 1]);
  });
});

describe('computeProvincias', () => {
  it('hides provinces without branches and skips branches whose provincia is not cataloged', () => {
    const { fd, lk } = fixture({
      sucursales: [
        makeRawSucursal({ SucursalId: 'S1', ProvinciaId: 'P1' }),
        makeRawSucursal({ SucursalId: 'S2', ProvinciaId: 'P9' }), // provincia desconocida
      ],
    });
    const { provincias } = computeProvincias(fd, lk, new Map());
    expect(provincias.map(p => p.nombre)).toEqual(['Buenos Aires']); // Cordoba vacía, P9 inexistente
    expect(provincias[0].ratingAverage).toBeNull();
  });
});
