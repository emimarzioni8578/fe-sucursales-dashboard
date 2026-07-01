import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardSource } from '@services/dashboard-source';
import { topRiesgo } from '@services/aggregations';
import { KpiCardComponent } from '@components/kpi-card/kpi-card';
import { SucursalDetailDialog } from '@components/sucursal-detail/sucursal-detail';
import type { DashboardData, SucursalRow } from '@models/data-models.model';
import { PALETTE, ESTADO_SERIES_COLORS, emptyChart } from '@shared/chart-theme';

@Component({
  selector: 'app-resumen-ejecutivo',
  standalone: true,
  imports: [MatCardModule, MatGridListModule, MatTableModule, MatButtonModule, MatIconModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './resumen-ejecutivo.html',
  styleUrl: './resumen-ejecutivo.scss',
})
export class ResumenEjecutivoComponent {
  private data = inject(DashboardSource);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  d = toSignal(this.data.data$);

  riesgoColumns = ['nombre', 'provincia', 'estado', 'compAbiertas', 'mailsFallidos', 'riesgo'];

  barChartType: ChartType = 'bar';
  doughnutType: ChartType = 'doughnut';
  lineChartType: ChartType = 'line';

  barOptions: ChartConfiguration['options'] = {
    responsive: true, plugins: { legend: { display: false } },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
  };
  doughnutOptions: ChartConfiguration['options'] = {
    responsive: true, plugins: { legend: { position: 'bottom' } },
  };
  lineOptions: ChartConfiguration['options'] = {
    responsive: true, plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true } },
  };

  // Memoizadas: solo se recalculan cuando cambia `d()`, no en cada ciclo de CD.
  barData = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getBarData(d) : emptyChart<'bar'>(); });
  estadoData = computed<ChartData<'doughnut'>>(() => { const d = this.d(); return d ? this.getEstadoData(d) : emptyChart<'doughnut'>(); });
  compMesData = computed<ChartData<'line'>>(() => { const d = this.d(); return d ? this.getCompMesData(d) : emptyChart<'line'>(); });

  // Top sucursales de riesgo de la selección actual: convierte el Resumen en accionable.
  topRiesgoRows = computed<SucursalRow[]>(() => { const d = this.d(); return d ? this.getTopRiesgo(d) : []; });

  getTopRiesgo(d: DashboardData): SucursalRow[] {
    return topRiesgo(d.sucursales, 10);
  }

  openDetail(row: SucursalRow): void {
    this.dialog.open(SucursalDetailDialog, { data: row, width: '520px', maxWidth: '95vw' });
  }

  verTodas(): void {
    this.router.navigate(['/sucursales']);
  }

  getBarData(d: DashboardData): ChartData<'bar'> {
    const labels = d.provincias.map(p => p.nombre);
    const [activa, inactiva, pendiente] = ESTADO_SERIES_COLORS;
    return {
      labels,
      datasets: [
        { label: 'Activas', data: d.provincias.map(p => p.activas), backgroundColor: activa },
        { label: 'Inactivas', data: d.provincias.map(p => p.inactivas), backgroundColor: inactiva },
        { label: 'Pendientes', data: d.provincias.map(p => p.pendientes), backgroundColor: pendiente },
      ],
    };
  }

  getEstadoData(d: DashboardData): ChartData<'doughnut'> {
    return {
      labels: ['Activas', 'Inactivas', 'Pendientes'],
      datasets: [{ data: [d.activas, d.inactivas, d.pendientes], backgroundColor: [...ESTADO_SERIES_COLORS] }],
    };
  }

  getCompMesData(d: DashboardData): ChartData<'line'> {
    return {
      labels: d.compPorMes.map(c => c.mes),
      datasets: [
        { label: 'Total', data: d.compPorMes.map(c => c.total), borderColor: PALETTE.blue, backgroundColor: 'rgba(79,195,247,.1)', fill: true, tension: 0.3 },
        { label: 'Abiertas', data: d.compPorMes.map(c => c.abiertas), borderColor: PALETTE.red, backgroundColor: 'rgba(239,83,80,.1)', fill: true, tension: 0.3 },
      ],
    };
  }
}
