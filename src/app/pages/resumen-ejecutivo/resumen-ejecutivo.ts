import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DataService } from '../../services/data';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';

@Component({
  selector: 'app-resumen-ejecutivo',
  standalone: true,
  imports: [AsyncPipe, MatCardModule, MatGridListModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './resumen-ejecutivo.html',
  styleUrl: './resumen-ejecutivo.scss',
})
export class ResumenEjecutivoComponent {
  data = inject(DataService);
  data$ = this.data.data$;

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

  getBarData(d: any): ChartData<'bar'> {
    const labels = d.provincias.map((p: any) => p.nombre);
    return {
      labels,
      datasets: [
        { label: 'Activas', data: d.provincias.map((p: any) => p.activas), backgroundColor: '#66bb6a' },
        { label: 'Inactivas', data: d.provincias.map((p: any) => p.inactivas), backgroundColor: '#ef5350' },
        { label: 'Pendientes', data: d.provincias.map((p: any) => p.pendientes), backgroundColor: '#ffa726' },
      ],
    };
  }

  getEstadoData(d: any): ChartData<'doughnut'> {
    return {
      labels: ['Activas', 'Inactivas', 'Pendientes'],
      datasets: [{ data: [d.activas, d.inactivas, d.pendientes], backgroundColor: ['#66bb6a','#ef5350','#ffa726'] }],
    };
  }

  getCompMesData(d: any): ChartData<'line'> {
    return {
      labels: d.compPorMes.map((c: any) => c.mes),
      datasets: [
        { label: 'Total', data: d.compPorMes.map((c: any) => c.total), borderColor: '#4fc3f7', backgroundColor: 'rgba(79,195,247,.1)', fill: true, tension: 0.3 },
        { label: 'Abiertas', data: d.compPorMes.map((c: any) => c.abiertas), borderColor: '#ef5350', backgroundColor: 'rgba(239,83,80,.1)', fill: true, tension: 0.3 },
      ],
    };
  }
}
