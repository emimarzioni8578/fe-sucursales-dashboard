import { Component, Input } from '@angular/core';
import { RATING_MAX } from '@models/domain.constants';
import { RATING_STAR_BASE_COLOR, RATING_STAR_COLOR } from '@shared/rating-stars';

/**
 * Rating de sucursal estilo Google: promedio, 5 estrellas con relleno parcial y cantidad
 * de votos. Con `average` null (sin votos) muestra "Sin calificaciones", nunca 0 estrellas.
 */
@Component({
  selector: 'app-rating-stars',
  standalone: true,
  template: `
    @if (average !== null) {
      <span class="rating" [attr.aria-label]="average + ' de ' + max + ' estrellas (' + count + ' votos)'">
        <b class="avg">{{ average.toFixed(1) }}</b>
        <span class="stars" aria-hidden="true">{{ stars }}
          <span class="fill" [style.width.%]="fillPct">{{ stars }}</span>
        </span>
        <span class="count">({{ count }})</span>
      </span>
    } @else {
      <span class="none">Sin calificaciones</span>
    }
  `,
  styles: [`
    .rating { display: inline-flex; align-items: center; gap: 4px; line-height: 1; }
    .stars { position: relative; display: inline-block; color: ${RATING_STAR_BASE_COLOR}; white-space: nowrap; }
    .fill { position: absolute; left: 0; top: 0; overflow: hidden; white-space: nowrap; color: ${RATING_STAR_COLOR}; }
    .count, .none { color: #888; }
  `],
})
export class RatingStarsComponent {
  @Input() average: number | null = null;
  @Input() count = 0;

  readonly max = RATING_MAX;
  readonly stars = '★'.repeat(RATING_MAX);
  get fillPct(): number {
    return (Math.min(Math.max(this.average ?? 0, 0), RATING_MAX) / RATING_MAX) * 100;
  }
}
