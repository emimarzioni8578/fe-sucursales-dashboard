import { Component, ViewChild, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardSource } from '@services/dashboard-source';
import { exportToCsv } from '@services/export.util';
import { bottomRating, criticasScoring, topRating, RANKING_MIN_VOTOS } from '@services/aggregations';
import { KpiCardComponent } from '@components/kpi-card/kpi-card';
import { RatingStarsComponent } from '@components/rating-stars/rating-stars';
import { SucursalDetailDialog } from '@components/sucursal-detail/sucursal-detail';
import type { DashboardData, ProvinciaData, SucursalRow } from '@models/data-models.model';
import { RATING_BAJO, RATING_MAX } from '@models/domain.constants';
import { RATING_SERIES_COLOR, emptyChart } from '@shared/chart-theme';

@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [
    MatCardModule, MatTableModule, MatSortModule, MatButtonModule, MatIconModule, MatChipsModule,
    BaseChartDirective, KpiCardComponent, RatingStarsComponent,
  ],
  templateUrl: './calificaciones.html',
  styleUrl: './calificaciones.scss',
})
export class CalificacionesComponent {
  private data = inject(DashboardSource);
  private dialog = inject(MatDialog);
  d = toSignal(this.data.data$);

  readonly ratingBajo = RATING_BAJO;
  readonly minVotos = RANKING_MIN_VOTOS;

  barType: ChartType = 'bar';
  // Barras horizontales de un solo tono: el trabajo del color acá es magnitud, no identidad
  // de serie, así que no hay leyenda (una sola serie) y el hover queda a cargo del tooltip.
  histOptions: ChartConfiguration['options'] = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  provOptions: ChartConfiguration['options'] = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, max: RATING_MAX } },
  };

  distribucionData = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getDistribucionData(d) : emptyChart<'bar'>(); });
  provinciaData = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getProvinciaData(d) : emptyChart<'bar'>(); });
  top = computed<SucursalRow[]>(() => { const d = this.d(); return d ? topRating(d.sucursales) : []; });
  bottom = computed<SucursalRow[]>(() => { const d = this.d(); return d ? bottomRating(d.sucursales) : []; });
  criticas = computed<SucursalRow[]>(() => { const d = this.d(); return d ? criticasScoring(d.sucursales) : []; });
  sinCalificar = computed<number>(() => { const d = this.d(); return d ? d.totalSucursales - d.sucCalificadas : 0; });

  /** Histograma estilo Google: 5★ arriba, 1★ abajo. */
  getDistribucionData(d: DashboardData): ChartData<'bar'> {
    const labels = d.ratingDistribucion.map((_, i) => `${d.ratingDistribucion.length - i}★`);
    const data = [...d.ratingDistribucion].reverse();
    return { labels, datasets: [{ label: 'Votos', data, backgroundColor: RATING_SERIES_COLOR, borderRadius: 4, maxBarThickness: 22 }] };
  }

  /** Promedio por provincia (solo las que tienen votos), ordenado de mejor a peor. */
  getProvinciaData(d: DashboardData): ChartData<'bar'> {
    const conVotos = d.provincias
      .filter(p => p.ratingAverage !== null)
      .sort((a, b) => b.ratingAverage! - a.ratingAverage! || a.nombre.localeCompare(b.nombre));
    return {
      labels: conVotos.map(p => p.nombre),
      datasets: [{ label: 'Promedio', data: conVotos.map(p => p.ratingAverage!), backgroundColor: RATING_SERIES_COLOR, borderRadius: 4, maxBarThickness: 14 }],
    };
  }

  /** Delta provincia vs. red a 1 decimal; null si alguna de las dos no tiene votos. */
  deltaRed(p: ProvinciaData): number | null {
    const red = this.d()?.ratingPromedioRed ?? null;
    return p.ratingAverage === null || red === null ? null : +(p.ratingAverage - red).toFixed(1);
  }

  dataSource = new MatTableDataSource<ProvinciaData>([]);
  displayedColumns = ['nombre', 'region', 'ratingAverage', 'ratingVotos', 'sucCalificadas', 'delta'];

  @ViewChild(MatSort) set sortSetter(s: MatSort | undefined) { if (s) this.dataSource.sort = s; }

  constructor() {
    // Las provincias sin votos ordenan al final, no como promedio 0.
    this.dataSource.sortingDataAccessor = (p, col) => {
      if (col === 'ratingAverage') return p.ratingAverage ?? -1;
      if (col === 'delta') return this.deltaRed(p) ?? -Infinity;
      return (p as unknown as Record<string, string | number>)[col];
    };
    this.data.data$.pipe(takeUntilDestroyed()).subscribe(d => {
      this.dataSource.data = d.provincias;
    });
  }

  openDetail(row: SucursalRow): void {
    this.dialog.open(SucursalDetailDialog, { data: row, width: '520px', maxWidth: '95vw' });
  }

  exportar(): void {
    const red = this.d()?.ratingPromedioRed;
    exportToCsv('calificaciones-provincias.csv',
      this.dataSource.data.map(p => ({ ...p, delta: this.deltaRed(p), red })), [
        { key: 'nombre', header: 'Provincia' }, { key: 'region', header: 'Región' },
        { key: 'ratingAverage', header: 'Calificación' }, { key: 'ratingVotos', header: 'Votos' },
        { key: 'sucCalificadas', header: 'Calificadas' }, { key: 'pctCalificadas', header: '% Calificadas' },
        { key: 'red', header: 'Promedio Red' }, { key: 'delta', header: 'Δ vs Red' },
      ]);
  }
}
