import { presetRange, RANGE_PRESETS } from './date-presets.util';

describe('date-presets.util', () => {
  // Fixed reference date for deterministic assertions.
  const today = new Date('2024-06-15T12:00:00Z');

  it('last30 spans the previous 30 days up to today', () => {
    expect(presetRange('last30', today)).toEqual({ desde: '2024-05-16', hasta: '2024-06-15' });
  });

  it('last90 spans the previous 90 days up to today', () => {
    expect(presetRange('last90', today)).toEqual({ desde: '2024-03-17', hasta: '2024-06-15' });
  });

  it('ytd spans from Jan 1st of the current year up to today', () => {
    expect(presetRange('ytd', today)).toEqual({ desde: '2024-01-01', hasta: '2024-06-15' });
  });

  it('hasta defaults to "today" and is never after it', () => {
    const r = presetRange('last30');
    const todayIso = new Date().toISOString().slice(0, 10);
    expect(r.hasta).toBe(todayIso);
    expect(r.desde <= r.hasta).toBe(true);
  });

  it('exposes three labelled presets', () => {
    expect(RANGE_PRESETS.map(p => p.key)).toEqual(['last30', 'last90', 'ytd']);
  });
});
