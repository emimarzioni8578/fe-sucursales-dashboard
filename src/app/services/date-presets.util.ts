export type RangePreset = 'last30' | 'last90' | 'ytd';

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Computes a { desde, hasta } range (YYYY-MM-DD) for a quick preset. */
export function presetRange(preset: RangePreset, today: Date = new Date()): { desde: string; hasta: string } {
  const hasta = iso(today);
  if (preset === 'ytd') {
    return { desde: `${today.getFullYear()}-01-01`, hasta };
  }
  const days = preset === 'last30' ? 30 : 90;
  return { desde: iso(new Date(today.getTime() - days * 86400000)), hasta };
}

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'last30', label: '30 días' },
  { key: 'last90', label: '90 días' },
  { key: 'ytd', label: 'Este año' },
];
