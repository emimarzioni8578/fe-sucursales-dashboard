import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardSource } from '@services/dashboard-source';
import { KpiCardComponent } from '@components/kpi-card/kpi-card';
import type { DashboardData } from '@models/data-models.model';
import { PALETTE, ESTADO_SERIES_COLORS, emptyChart } from '@shared/chart-theme';

@Component({
  selector: 'app-emails-verificacion',
  standalone: true,
  imports: [MatCardModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './emails-verificacion.html',
  styleUrl: './emails-verificacion.scss',
})
export class EmailsVerificacionComponent {
  private data = inject(DashboardSource);
  d = toSignal(this.data.data$);

  doughnutType: ChartType = 'doughnut';
  barType: ChartType = 'bar';

  doughnutOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'bottom' } } };
  barOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } };
  horizBarOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } }, indexAxis: 'y' };

  mailsEstado = computed<ChartData<'doughnut'>>(() => { const d = this.d(); return d ? this.getMailsEstado(d) : emptyChart<'doughnut'>(); });
  mailsAsunto = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getMailsAsunto(d) : emptyChart<'bar'>(); });
  mailsProvincia = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getMailsProvincia(d) : emptyChart<'bar'>(); });

  getMailsEstado(d: DashboardData): ChartData<'doughnut'> {
    const otros = d.totalMails - d.mailsEnviados - d.mailsFallidos;
    return { labels: ['Enviados', 'Fallidos', 'Pendientes'], datasets: [{ data: [d.mailsEnviados, d.mailsFallidos, otros], backgroundColor: [...ESTADO_SERIES_COLORS] }] };
  }
  getMailsAsunto(d: DashboardData): ChartData<'bar'> {
    return {
      labels: d.mailsPorAsunto.map(m => m.asunto.length > 30 ? m.asunto.substring(0, 30) + '...' : m.asunto),
      datasets: [
        { label: 'Total', data: d.mailsPorAsunto.map(m => m.total), backgroundColor: PALETTE.blue },
        { label: 'Fallidos', data: d.mailsPorAsunto.map(m => m.fallidos), backgroundColor: PALETTE.red },
      ],
    };
  }
  getMailsProvincia(d: DashboardData): ChartData<'bar'> {
    const p = d.provincias.filter(x => x.mailsTotal > 0);
    return {
      labels: p.map(x => x.nombre),
      datasets: [
        { label: 'Mails Totales', data: p.map(x => x.mailsTotal), backgroundColor: PALETTE.blue },
        { label: 'Mails Fallidos', data: p.map(x => x.mailsFallidos), backgroundColor: PALETTE.red },
      ],
    };
  }
}
