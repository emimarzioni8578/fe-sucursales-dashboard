import { RATING_MAX } from '@models/domain.constants';

/** Colores del rating estilo Google: estrellas ámbar sobre base gris. */
export const RATING_STAR_COLOR = '#fbbc04';
export const RATING_STAR_BASE_COLOR = '#bdbdbd';

const STARS = '★'.repeat(RATING_MAX);

/**
 * HTML plano del rating estilo Google (`4.3 ★★★★☆ (27)`) para superficies fuera de Angular,
 * como los popups de Leaflet. El relleno parcial se logra recortando por ancho una capa de
 * estrellas ámbar sobre la base gris. Con `average` null muestra "Sin calificaciones".
 */
export function ratingStarsHtml(average: number | null, count: number): string {
  if (average === null) {
    return `<span style="color:#888">Sin calificaciones</span>`;
  }
  // toFixed evita colas binarias en el HTML (3.7/5*100 → "74.00000000000001").
  const fillPct = +((Math.min(Math.max(average, 0), RATING_MAX) / RATING_MAX) * 100).toFixed(2);
  return (
    `<span style="display:inline-flex;align-items:center;gap:4px;line-height:1">` +
    `<b>${average.toFixed(1)}</b>` +
    `<span style="position:relative;display:inline-block;color:${RATING_STAR_BASE_COLOR};font-size:14px">${STARS}` +
    `<span style="position:absolute;left:0;top:0;overflow:hidden;white-space:nowrap;width:${fillPct}%;color:${RATING_STAR_COLOR}">${STARS}</span>` +
    `</span>` +
    `<span style="color:#888">(${count})</span>` +
    `</span>`
  );
}
