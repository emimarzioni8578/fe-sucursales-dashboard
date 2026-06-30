import { AR_BOUNDS } from '@models/domain.constants';

export interface CoordInfo {
  lat: number | null;
  lng: number | null;
  /** Latitud y longitud presentes y numéricas. */
  hasCoord: boolean;
  /** Tiene coordenada y cae dentro del bounding box de Argentina. */
  coordValida: boolean;
  /** Tiene coordenada pero cae fuera del bounding box. */
  coordInvalida: boolean;
  /** No tiene coordenada utilizable. */
  sinCoord: boolean;
}

/** Parsea y clasifica las coordenadas crudas (string) de una sucursal. */
export function classifyCoord(latStr: string | undefined, lngStr: string | undefined): CoordInfo {
  const lat = parseFloat(latStr ?? '');
  const lng = parseFloat(lngStr ?? '');
  const hasCoord = hasCoordText({ Latitud: latStr, Longitud: lngStr }) && !isNaN(lat) && !isNaN(lng);
  const coordValida =
    hasCoord &&
    lat >= AR_BOUNDS.latMin && lat <= AR_BOUNDS.latMax &&
    lng >= AR_BOUNDS.lngMin && lng <= AR_BOUNDS.lngMax;
  return {
    lat: hasCoord ? lat : null,
    lng: hasCoord ? lng : null,
    hasCoord,
    coordValida,
    coordInvalida: hasCoord && !coordValida,
    sinCoord: !hasCoord,
  };
}

/** Presencia textual de lat/lng (sin validar que sean numéricas). */
export const hasCoordText = (s: { Latitud?: string; Longitud?: string }): boolean =>
  !!(s.Latitud?.trim() && s.Longitud?.trim());
