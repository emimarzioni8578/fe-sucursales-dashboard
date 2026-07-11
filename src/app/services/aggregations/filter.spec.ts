import { applyFilter, hasActiveFilter, rowMatches, EMPTY_FILTER, type DashboardFilter } from './filter';
import { buildLookups } from './lookups';
import { makeRawData, makeRawSucursal, makeSucursalRow } from '@testing/mocks';

const f = (partial: Partial<DashboardFilter>): DashboardFilter => ({ ...EMPTY_FILTER, ...partial });

describe('applyFilter (rango de fechas)', () => {
  const raw = makeRawData({
    sucursales: [makeRawSucursal({ SucursalId: 'S1' })],
    compReqs: [
      { CompensationRequestId: 'C1', SucursalId: 'S1', UserId: 'U1', CompensationRequestStateId: '1', IsOpen: '1', CreatedAt: '2026-01-15', ErrorId: '' },
      { CompensationRequestId: 'C2', SucursalId: 'S1', UserId: 'U1', CompensationRequestStateId: '1', IsOpen: '1', CreatedAt: '2026-03-15', ErrorId: '' },
      { CompensationRequestId: 'C3', SucursalId: 'S1', UserId: 'U1', CompensationRequestStateId: '1', IsOpen: '1', CreatedAt: '', ErrorId: '' },
    ],
    compErrors: [
      { CompensationRequestErrorId: 'CE1', CompensationRequestId: 'C1', ErrorId: 'E1' },
      { CompensationRequestErrorId: 'CE2', CompensationRequestId: 'C2', ErrorId: 'E1' },
    ],
    ratings: [
      { SucursalRatingId: 'R1', SucursalId: 'S1', UserId: 'U1', Score: '4', CreatedAt: '2020-01-01', UpdatedAt: '2020-01-01' },
    ],
    monitoring: [
      { MonitoringId: 'MO1', UserId: 'U1', AffectedTable: 't', MonitoringActionId: '1', CreatedAt: '2026-01-20' },
      { MonitoringId: 'MO2', UserId: 'U1', AffectedTable: 't', MonitoringActionId: '1', CreatedAt: '2026-04-01' },
    ],
  });
  const lk = buildLookups(raw);

  it('los límites [desde, hasta] son inclusivos', () => {
    const fd = applyFilter(raw, lk, f({ desde: '2026-01-15', hasta: '2026-01-15' }));
    expect(fd.compReqs.map(c => c.CompensationRequestId)).toEqual(['C1']);
  });

  it('desde solo / hasta solo acotan cada extremo', () => {
    expect(applyFilter(raw, lk, f({ desde: '2026-02-01' })).compReqs.map(c => c.CompensationRequestId)).toEqual(['C2']);
    expect(applyFilter(raw, lk, f({ hasta: '2026-02-01' })).compReqs.map(c => c.CompensationRequestId)).toEqual(['C1']);
  });

  it('con rango activo, los registros sin fecha quedan afuera', () => {
    const fd = applyFilter(raw, lk, f({ desde: '2020-01-01' }));
    expect(fd.compReqs.map(c => c.CompensationRequestId)).toEqual(['C1', 'C2']); // C3 sin fecha
  });

  it('los errores solo acompañan a las compensaciones incluidas (cascada)', () => {
    const fd = applyFilter(raw, lk, f({ hasta: '2026-02-01' }));
    expect(fd.compErrors.map(e => e.CompensationRequestErrorId)).toEqual(['CE1']);
  });

  it('la auditoría se acota por fecha aunque no tenga SucursalId', () => {
    const fd = applyFilter(raw, lk, f({ hasta: '2026-02-01' }));
    expect(fd.monitoring.map(m => m.MonitoringId)).toEqual(['MO1']);
  });

  it('los ratings son estado vigente: el rango de fechas NO los recorta', () => {
    const fd = applyFilter(raw, lk, f({ desde: '2026-01-01' }));
    expect(fd.ratings).toHaveLength(1); // voto de 2020, sigue vigente
  });

  it('los ratings sí caen en cascada cuando su sucursal queda fuera del filtro', () => {
    const fd = applyFilter(raw, lk, f({ provincia: 'P2' }));
    expect(fd.sucursales).toEqual([]);
    expect(fd.ratings).toEqual([]);
  });
});

describe('rowMatches', () => {
  const row = makeSucursalRow({ provinciaId: 'P1', region: 'Pampeana', estado: 'Activa' });

  it('matches when every active criterion coincides', () => {
    expect(rowMatches(row, f({ provincia: 'P1', region: 'Pampeana', estado: 'Activa' }))).toBe(true);
  });

  it.each([
    ['provincia', f({ provincia: 'P2' })],
    ['region', f({ region: 'Centro' })],
    ['estado', f({ estado: 'Inactiva' })],
  ])('rejects on %s mismatch', (_label, filtro) => {
    expect(rowMatches(row, filtro)).toBe(false);
  });
});

describe('hasActiveFilter', () => {
  it('is false for the empty filter and true for each individual criterion', () => {
    expect(hasActiveFilter(EMPTY_FILTER)).toBe(false);
    expect(hasActiveFilter(f({ provincia: 'P1' }))).toBe(true);
    expect(hasActiveFilter(f({ region: 'Centro' }))).toBe(true);
    expect(hasActiveFilter(f({ estado: 'Activa' }))).toBe(true);
    expect(hasActiveFilter(f({ desde: '2026-01-01' }))).toBe(true);
    expect(hasActiveFilter(f({ hasta: '2026-01-01' }))).toBe(true);
  });
});
