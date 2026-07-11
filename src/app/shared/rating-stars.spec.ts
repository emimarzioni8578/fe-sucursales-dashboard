import { ratingStarsHtml, RATING_STAR_BASE_COLOR, RATING_STAR_COLOR } from './rating-stars';

describe('ratingStarsHtml', () => {
  it('shows "Sin calificaciones" for null average — never 0 stars', () => {
    const html = ratingStarsHtml(null, 0);
    expect(html).toContain('Sin calificaciones');
    expect(html).not.toContain('★');
  });

  it('renders average, both star layers and the vote count', () => {
    const html = ratingStarsHtml(4.3, 27);
    expect(html).toContain('<b>4.3</b>');
    expect(html).toContain('(27)');
    expect(html).toContain('width:86%'); // 4.3/5 de relleno ámbar
    expect(html.match(/★★★★★/g)?.length).toBe(2); // capa base gris + capa ámbar
    expect(html).toContain(RATING_STAR_COLOR);
    expect(html).toContain(RATING_STAR_BASE_COLOR);
  });

  it('always shows 1 decimal, Google style', () => {
    expect(ratingStarsHtml(5, 3)).toContain('<b>5.0</b>');
  });

  it('clamps the fill to the 0–100% range on out-of-range averages', () => {
    expect(ratingStarsHtml(7, 1)).toContain('width:100%');
    expect(ratingStarsHtml(-1, 1)).toContain('width:0%');
  });

  it('does not leak binary tails into the width (3.7 → 74%, not 74.00000000000001%)', () => {
    expect(ratingStarsHtml(3.7, 5)).toContain('width:74%');
  });
});
