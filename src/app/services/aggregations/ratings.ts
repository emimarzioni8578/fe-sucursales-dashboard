import type { SucursalRating } from '@models/data-models.model';
import { RATING_MAX, RATING_MIN } from '@models/domain.constants';

/** Suma y cantidad de votos vigentes de una sucursal (espejo de `RatingAggregate` del backend). */
export interface RatingAggregate { sum: number; count: number; }

/** Voto vigente ya validado y deduplicado (un usuario, una sucursal). */
export interface RatingVote { sucursalId: string; score: number; }

/**
 * Espejo de `SucursalRatingCalculator` del backend (única fuente de la regla):
 * `average = SUM(score) / COUNT` redondeado a 1 decimal alejándose de cero (4.25 → 4.3),
 * y `null` sin votos — "sin calificar" y "1 estrella" son cosas distintas, NUNCA 0.
 */
export function ratingAverage(sum: number, count: number): number | null {
  if (count <= 0) return null;
  // Aritmética entera exacta: dividir en flotante corre los medios puntos
  // (87/20 → 4.3499…96 → redondearía a 4.3; el decimal del backend da 4.4).
  const num = 10 * sum;
  const resto = num % count;
  const cociente = (num - resto) / count;
  return (2 * resto >= count ? cociente + 1 : cociente) / 10;
}

/**
 * Votos vigentes replicando las invariantes del backend: a lo sumo un voto por
 * (SucursalId, UserId) — ante duplicados gana el último, como el upsert — y los
 * scores fuera de 1..5 se descartan.
 */
export function vigentes(ratings: SucursalRating[]): RatingVote[] {
  const voteByKey = new Map<string, RatingVote>();
  for (const r of ratings) {
    const score = parseInt(r.Score);
    if (!r.SucursalId || !r.UserId || isNaN(score) || score < RATING_MIN || score > RATING_MAX) continue;
    voteByKey.set(`${r.SucursalId}|${r.UserId}`, { sucursalId: r.SucursalId, score });
  }
  return [...voteByKey.values()];
}

/** Agrega los votos vigentes por sucursal (suma y cantidad). */
export function buildRatingIndex(ratings: SucursalRating[]): Map<string, RatingAggregate> {
  const index = new Map<string, RatingAggregate>();
  for (const { sucursalId, score } of vigentes(ratings)) {
    const agg = index.get(sucursalId) || { sum: 0, count: 0 };
    agg.sum += score;
    agg.count++;
    index.set(sucursalId, agg);
  }
  return index;
}

/**
 * Histograma de votos vigentes puntaje → cantidad, siempre con las 5 posiciones
 * (índice 0 = 1★ … 4 = 5★), como el `Distribution` normalizado del backend.
 */
export function buildRatingHistogram(ratings: SucursalRating[]): number[] {
  const hist = new Array<number>(RATING_MAX - RATING_MIN + 1).fill(0);
  for (const { score } of vigentes(ratings)) hist[score - RATING_MIN]++;
  return hist;
}
