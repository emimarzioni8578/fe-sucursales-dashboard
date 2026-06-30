import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardSource } from '@services/dashboard-source';
import { KpiCardComponent } from '@components/kpi-card/kpi-card';
import type { DashboardData } from '@models/data-models.model';
import { PALETTE, COMP_ESTADO_COLORS, ERROR_TIPO_COLORS, emptyChart } from '@shared/chart-theme';

@Component({
  selector: 'app-riesgo-compensaciones',
  standalone: true,
  imports: [MatCardModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './riesgo-compensaciones.html',
  styleUrl: './riesgo-compensaciones.scss',
})
export class RiesgoCompensacionesComponent {
  private data = inject(DashboardSource);
  d = toSignal(this.data.data$);

  doughnutType: ChartType = 'doughnut';
  barType: ChartType = 'bar';

  doughnutOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'bottom' } } };
  barOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
  stackedBarOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } };

  estadoData = computed<ChartData<'doughnut'>>(() => { const d = this.d(); return d ? this.getEstadoData(d) : emptyChart<'doughnut'>(); });
  errorData = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getErrorData(d) : emptyChart<'bar'>(); });
  compMesData = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getCompMesData(d) : emptyChart<'bar'>(); });

  getEstadoData(d: DashboardData): ChartData<'doughnut'> {
    return {
      labels: ['Pendientes', 'En Revisión', 'Aprobadas', 'Rechazadas'],
      datasets: [{ data: [d.compPendientes, d.compEnRevision, d.compAprobadas, d.compRechazadas], backgroundColor: [...COMP_ESTADO_COLORS] }],
    };
  }
  getErrorData(d: DashboardData): ChartData<'bar'> {
    return { labels: d.erroresPorTipo.map(e => e.tipo), datasets: [{ label: 'Cantidad', data: d.erroresPorTipo.map(e => e.total), backgroundColor: [...ERROR_TIPO_COLORS] }] };
  }
  getCompMesData(d: DashboardData): ChartData<'bar'> {
    return {
      labels: d.compPorMes.map(c => c.mes),
      datasets: [
        { label: 'Abiertas', data: d.compPorMes.map(c => c.abiertas), backgroundColor: PALETTE.red },
        { label: 'Cerradas', data: d.compPorMes.map(c => c.total - c.abiertas), backgroundColor: PALETTE.green },
      ],
    };
  }
}
