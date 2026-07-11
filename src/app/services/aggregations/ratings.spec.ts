import { buildRatingHistogram, buildRatingIndex, ratingAverage } from './ratings';
import type { SucursalRating } from '@models/data-models.model';

function vote(partial: Partial<SucursalRating>): SucursalRating {
  return {
    SucursalRatingId: '1', SucursalId: 'S1', UserId: 'U1', Score: '4',
    CreatedAt: '2026-01-10', UpdatedAt: '2026-01-10',
    ...partial,
  };
}

describe('ratingAverage', () => {
  it('is null without votes — "sin calificar" is not 0 stars', () => {
    expect(ratingAverage(0, 0)).toBeNull();
  });

  it('rounds to 1 decimal away from zero, like the backend calculator (4.25 → 4.3)', () => {
    expect(ratingAverage(17, 4)).toBe(4.3); // 4.25
    expect(ratingAverage(7, 2)).toBe(3.5);
    expect(ratingAverage(87, 20)).toBe(4.4); // 4.35: en flotante queda 4.3499…96 y redondearía mal
    expect(ratingAverage(13, 3)).toBe(4.3); // 4.333…
  });

  it('keeps exact averages untouched', () => {
    expect(ratingAverage(10, 2)).toBe(5);
    expect(ratingAverage(4, 4)).toBe(1);
  });
});

describe('buildRatingIndex', () => {
  it('aggregates sum and count per sucursal', () => {
    const idx = buildRatingIndex([
      vote({ SucursalRatingId: '1', UserId: 'U1', Score: '5' }),
      vote({ SucursalRatingId: '2', UserId: 'U2', Score: '4' }),
      vote({ SucursalRatingId: '3', SucursalId: 'S2', UserId: 'U1', Score: '2' }),
    ]);
    expect(idx.get('S1')).toEqual({ sum: 9, count: 2 });
    expect(idx.get('S2')).toEqual({ sum: 2, count: 1 });
    expect(idx.get('S3')).toBeUndefined();
  });

  it('keeps only the last vote per (sucursal, usuario) — upsert semantics', () => {
    const idx = buildRatingIndex([
      vote({ SucursalRatingId: '1', UserId: 'U1', Score: '1' }),
      vote({ SucursalRatingId: '2', UserId: 'U1', Score: '5' }),
    ]);
    expect(idx.get('S1')).toEqual({ sum: 5, count: 1 });
  });

  it('builds the full 1..5 histogram over deduped votes', () => {
    const hist = buildRatingHistogram([
      vote({ SucursalRatingId: '1', UserId: 'U1', Score: '1' }),
      vote({ SucursalRatingId: '2', UserId: 'U1', Score: '5' }), // re-voto: reemplaza el 1★
      vote({ SucursalRatingId: '3', UserId: 'U2', Score: '5' }),
      vote({ SucursalRatingId: '4', SucursalId: 'S2', UserId: 'U1', Score: '3' }),
    ]);
    expect(hist).toEqual([0, 0, 1, 0, 2]); // índice 0 = 1★ … 4 = 5★
  });

  it('discards scores outside 1..5 and rows without ids', () => {
    const idx = buildRatingIndex([
      vote({ SucursalRatingId: '1', UserId: 'U1', Score: '0' }),
      vote({ SucursalRatingId: '2', UserId: 'U2', Score: '6' }),
      vote({ SucursalRatingId: '3', UserId: 'U3', Score: 'nope' }),
      vote({ SucursalRatingId: '4', UserId: '', Score: '5' }),
      vote({ SucursalRatingId: '5', SucursalId: '', Score: '5' }),
      vote({ SucursalRatingId: '6', UserId: 'U6', Score: '3' }),
    ]);
    expect(idx.get('S1')).toEqual({ sum: 3, count: 1 });
  });
});
