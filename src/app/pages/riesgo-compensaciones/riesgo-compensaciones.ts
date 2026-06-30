import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DataService } from '../../services/data';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';

@Component({
  selector: 'app-riesgo-compensaciones',
  standalone: true,
  imports: [AsyncPipe, MatCardModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './riesgo-compensaciones.html',
  styleUrl: './riesgo-compensaciones.scss',
})
export class RiesgoCompensacionesComponent {
  data = inject(DataService);
  data$ = this.data.data$;

  doughnutType: ChartType = 'doughnut';
  barType: ChartType = 'bar';

  doughnutOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'bottom' } } };
  barOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
  stackedBarOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } };

  getEstadoData(d: any): ChartData<'doughnut'> {
    return { labels: ['Pendientes','En Revisión','Aprobadas','Rechazadas'], datasets: [{ data: [d.compPendientes,d.compEnRevision,d.compAprobadas,d.compRechazadas], backgroundColor: ['#ffa726','#4fc3f7','#66bb6a','#ef5350'] }] };
  }
  getErrorData(d: any): ChartData<'bar'> {
    return { labels: d.erroresPorTipo.map((e:any) => e.tipo), datasets: [{ label: 'Cantidad', data: d.erroresPorTipo.map((e:any) => e.total), backgroundColor: ['#4fc3f7','#ab47bc','#ffa726'] }] };
  }
  getCompMesData(d: any): ChartData<'bar'> {
    return {
      labels: d.compPorMes.map((c:any) => c.mes),
      datasets: [
        { label: 'Abiertas', data: d.compPorMes.map((c:any) => c.abiertas), backgroundColor: '#ef5350' },
        { label: 'Cerradas', data: d.compPorMes.map((c:any) => c.total - c.abiertas), backgroundColor: '#66bb6a' },
      ],
    };
  }
}
