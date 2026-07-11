import { bottomRating, criticasScoring, topRating, topRiesgo } from './selectors';
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

describe('topRating / bottomRating', () => {
  const rows = [
    makeSucursalRow({ id: 'A', ratingAverage: 4.5, ratingCount: 10 }),
    makeSucursalRow({ id: 'B', ratingAverage: 2.1, ratingCount: 8 }),
    makeSucursalRow({ id: 'C', ratingAverage: 5, ratingCount: 2 }),   // pocos votos: fuera del ranking
    makeSucursalRow({ id: 'D', ratingAverage: null, ratingCount: 0 }), // sin calificar: fuera
  ];

  it('excludes branches below the vote threshold — a 5.0 with 2 votes does not win', () => {
    expect(topRating(rows).map(r => r.id)).toEqual(['A', 'B']);
  });

  it('bottomRating sorts ascending with the same threshold', () => {
    expect(bottomRating(rows).map(r => r.id)).toEqual(['B', 'A']);
  });

  it('tie-breaks by vote count (more votes = more reliable) then id', () => {
    const tied = [
      makeSucursalRow({ id: 'B', ratingAverage: 4, ratingCount: 5 }),
      makeSucursalRow({ id: 'A', ratingAverage: 4, ratingCount: 9 }),
    ];
    expect(topRating(tied).map(r => r.id)).toEqual(['A', 'B']);
  });

  it('respects the N limit', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      makeSucursalRow({ id: `S${i}`, ratingAverage: 3 + (i % 3), ratingCount: 6 }));
    expect(topRating(many, 4).length).toBe(4);
  });
});

describe('criticasScoring', () => {
  it('keeps only low-rating branches with operational risk, sorted by riesgo desc', () => {
    const rows = [
      makeSucursalRow({ id: 'A', ratingAverage: 2.5, ratingCount: 6, riesgo: 3 }),
      makeSucursalRow({ id: 'B', ratingAverage: 2.9, ratingCount: 6, riesgo: 8 }),
      makeSucursalRow({ id: 'C', ratingAverage: 4.5, ratingCount: 6, riesgo: 9 }), // buen rating: fuera
      makeSucursalRow({ id: 'D', ratingAverage: 1.5, ratingCount: 6, riesgo: 0 }), // sin riesgo: fuera
      makeSucursalRow({ id: 'E', ratingAverage: null, ratingCount: 0, riesgo: 7 }), // sin votos: fuera
    ];
    expect(criticasScoring(rows).map(r => r.id)).toEqual(['B', 'A']);
  });

  it('tie-breaks by worst rating first', () => {
    const rows = [
      makeSucursalRow({ id: 'A', ratingAverage: 2.8, ratingCount: 6, riesgo: 5 }),
      makeSucursalRow({ id: 'B', ratingAverage: 1.2, ratingCount: 6, riesgo: 5 }),
    ];
    expect(criticasScoring(rows).map(r => r.id)).toEqual(['B', 'A']);
  });
});
