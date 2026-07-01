import { topRiesgo } from './selectors';
import { makeSucursalRow } from '@testing/mocks';

describe('topRiesgo', () => {
  it('orders by riesgo desc and excludes zero-risk branches', () => {
    const rows = [
      makeSucursalRow({ id: 'A', riesgo: 0 }),
      makeSucursalRow({ id: 'B', riesgo: 5 }),
      makeSucursalRow({ id: 'C', riesgo: 2 }),
    ];
    expect(topRiesgo(rows).map(r => r.id)).toEqual(['B', 'C']);
  });

  it('respects the N limit', () => {
    const rows = Array.from({ length: 15 }, (_, i) => makeSucursalRow({ id: `S${i}`, riesgo: i + 1 }));
    expect(topRiesgo(rows, 5).length).toBe(5);
  });

  it('does not mutate the input array', () => {
    const rows = [makeSucursalRow({ id: 'A', riesgo: 1 }), makeSucursalRow({ id: 'B', riesgo: 9 })];
    topRiesgo(rows);
    expect(rows.map(r => r.id)).toEqual(['A', 'B']);
  });

  it('tie-breaks by compAbiertas then id', () => {
    const rows = [
      makeSucursalRow({ id: 'B', riesgo: 5, compAbiertas: 1 }),
      makeSucursalRow({ id: 'A', riesgo: 5, compAbiertas: 1 }),
      makeSucursalRow({ id: 'C', riesgo: 5, compAbiertas: 2 }),
    ];
    expect(topRiesgo(rows).map(r => r.id)).toEqual(['C', 'A', 'B']);
  });
});
