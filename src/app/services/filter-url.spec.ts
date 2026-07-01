import { filterToParams, paramsToFilter, filterKey } from './filter-url';
import { EMPTY_FILTER } from './aggregations';

describe('filter-url', () => {
  it('serializes only non-null keys', () => {
    expect(filterToParams({ ...EMPTY_FILTER, provincia: 'P1', desde: '2024-01-01' }))
      .toEqual({ provincia: 'P1', desde: '2024-01-01' });
  });

  it('round-trips a filter through params', () => {
    const f = { provincia: 'P1', region: null, estado: 'Activa', desde: '2024-01-01', hasta: null };
    expect(paramsToFilter(filterToParams(f))).toEqual(f);
  });

  it('parses missing keys as null', () => {
    expect(paramsToFilter({})).toEqual(EMPTY_FILTER);
  });

  it('ignores non-string param values', () => {
    expect(paramsToFilter({ provincia: ['P1', 'P2'] as unknown as string })).toEqual(EMPTY_FILTER);
  });

  it('filterKey is stable for equal filters and differs otherwise', () => {
    expect(filterKey(EMPTY_FILTER)).toBe(filterKey({ ...EMPTY_FILTER }));
    expect(filterKey({ ...EMPTY_FILTER, provincia: 'P1' })).not.toBe(filterKey(EMPTY_FILTER));
  });
});
