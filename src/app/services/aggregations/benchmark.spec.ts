import { provinciaBenchmark } from './benchmark';
import { makeProvinciaData } from '@testing/mocks';

describe('provinciaBenchmark', () => {
  const net = { pctActivas: 60, pctCobDist: 40, pctCobSocial: 20, pctMailsFallidos: 50 };

  it('builds one row per compared metric with signed deltas', () => {
    const p = makeProvinciaData({ pctActivas: 66.7, pctCoberturaDist: 66.7, pctCoberturaSocial: 66.7, pctMailsFallidos: 50 });
    const rows = provinciaBenchmark(p, net);
    expect(rows.map(r => r.label)).toEqual(['% Activas', '% Cobertura Distribuidor', '% Cobertura Social', '% Mails Fallidos']);
    expect(rows[0].delta).toBe(6.7);
    expect(rows[3].delta).toBe(0);
  });

  it('marks coverage/activity as higherIsBetter and mail failures as not', () => {
    const rows = provinciaBenchmark(makeProvinciaData(), net);
    expect(rows.slice(0, 3).every(r => r.higherIsBetter)).toBe(true);
    expect(rows[3].higherIsBetter).toBe(false);
  });

  it('rounds deltas to one decimal', () => {
    const p = makeProvinciaData({ pctActivas: 63.33 });
    const rows = provinciaBenchmark(p, { ...net, pctActivas: 60 });
    expect(rows[0].delta).toBe(3.3);
  });
});
