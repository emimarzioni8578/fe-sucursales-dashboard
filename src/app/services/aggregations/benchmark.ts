import type { ProvinciaData } from '@models/data-models.model';

/** Métricas de red (promedio ponderado ya calculado en `DashboardData`) contra las que se compara una provincia. */
export interface NetworkMetrics {
  pctActivas: number;
  pctCobDist: number;
  pctCobSocial: number;
  pctMailsFallidos: number;
}

/** Una fila de comparación provincia vs. red. `delta = value - network` (1 decimal). */
export interface BenchmarkRow {
  label: string;
  value: number;
  network: number;
  delta: number;
  /** Si subir es bueno (cobertura/activas) o malo (mails fallidos); define el color del delta. */
  higherIsBetter: boolean;
}

const d1 = (x: number): number => +x.toFixed(1);

/** Construye las filas de benchmark de una provincia contra el promedio de la red. */
export function provinciaBenchmark(p: ProvinciaData, net: NetworkMetrics): BenchmarkRow[] {
  return [
    { label: '% Activas', value: p.pctActivas, network: net.pctActivas, delta: d1(p.pctActivas - net.pctActivas), higherIsBetter: true },
    { label: '% Cobertura Distribuidor', value: p.pctCoberturaDist, network: net.pctCobDist, delta: d1(p.pctCoberturaDist - net.pctCobDist), higherIsBetter: true },
    { label: '% Cobertura Social', value: p.pctCoberturaSocial, network: net.pctCobSocial, delta: d1(p.pctCoberturaSocial - net.pctCobSocial), higherIsBetter: true },
    { label: '% Mails Fallidos', value: p.pctMailsFallidos, network: net.pctMailsFallidos, delta: d1(p.pctMailsFallidos - net.pctMailsFallidos), higherIsBetter: false },
  ];
}
