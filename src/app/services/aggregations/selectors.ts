import type { SucursalRow } from '@models/data-models.model';
import { RATING_BAJO } from '@models/domain.constants';

/**
 * Top-N sucursales por score de riesgo (descendente). Excluye las de riesgo 0
 * para que la lista destaque solo lo accionable. Desempata por compensaciones
 * abiertas y, en última instancia, por id (orden estable).
 *
 * Opera sobre una copia (`filter` ya devuelve un array nuevo), así que no muta
 * el `sucursales` de `DashboardData` que consume la tabla de Sucursales.
 */
export function topRiesgo(sucursales: SucursalRow[], n = 10): SucursalRow[] {
  return sucursales
    .filter(s => s.riesgo > 0)
    .sort((a, b) => b.riesgo - a.riesgo || b.compAbiertas - a.compAbiertas || a.id.localeCompare(b.id))
    .slice(0, n);
}

/** Umbral de votos para entrar al ranking: un 5.0 con un voto no debe ganarle a un 4.8 con 40. */
export const RANKING_MIN_VOTOS = 5;

const porRating = (dir: 1 | -1) => (a: SucursalRow, b: SucursalRow): number =>
  dir * (b.ratingAverage! - a.ratingAverage!) || b.ratingCount - a.ratingCount || a.id.localeCompare(b.id);

/**
 * Top-N sucursales por calificación (descendente). Solo entran las que superan
 * `minVotos` para que el ranking no lo dominen promedios de una sola opinión.
 * Desempata por cantidad de votos (más votos = promedio más confiable) y por id.
 */
export function topRating(sucursales: SucursalRow[], n = 10, minVotos = RANKING_MIN_VOTOS): SucursalRow[] {
  return sucursales
    .filter(s => s.ratingAverage !== null && s.ratingCount >= minVotos)
    .sort(porRating(1))
    .slice(0, n);
}

/** Bottom-N por calificación (ascendente), con el mismo umbral de votos que el top. */
export function bottomRating(sucursales: SucursalRow[], n = 10, minVotos = RANKING_MIN_VOTOS): SucursalRow[] {
  return sucursales
    .filter(s => s.ratingAverage !== null && s.ratingCount >= minVotos)
    .sort(porRating(-1))
    .slice(0, n);
}

/**
 * Sucursales críticas: mala experiencia (rating < RATING_BAJO) Y riesgo operativo,
 * candidatas a intervención. Ordena por riesgo (desc) y desempata por peor rating.
 */
export function criticasScoring(sucursales: SucursalRow[], n = 10): SucursalRow[] {
  return sucursales
    .filter(s => s.ratingAverage !== null && s.ratingAverage < RATING_BAJO && s.riesgo > 0)
    .sort((a, b) => b.riesgo - a.riesgo || a.ratingAverage! - b.ratingAverage! || a.id.localeCompare(b.id))
    .slice(0, n);
}
