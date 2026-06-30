import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DataService } from '../../services/data';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';

@Component({
  selector: 'app-emails-verificacion',
  standalone: true,
  imports: [AsyncPipe, MatCardModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './emails-verificacion.html',
  styleUrl: './emails-verificacion.scss',
})
export class EmailsVerificacionComponent {
  data = inject(DataService);
  data$ = this.data.data$;

  doughnutType: ChartType = 'doughnut';
  barType: ChartType = 'bar';

  doughnutOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'bottom' } } };
  barOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } };
  horizBarOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } }, indexAxis: 'y' };

  getMailsEstado(d: any): ChartData<'doughnut'> {
    const otros = d.totalMails - d.mailsEnviados - d.mailsFallidos;
    return { labels: ['Enviados','Fallidos','Pendientes'], datasets: [{ data: [d.mailsEnviados,d.mailsFallidos,otros], backgroundColor: ['#66bb6a','#ef5350','#ffa726'] }] };
  }
  getMailsAsunto(d: any): ChartData<'bar'> {
    return {
      labels: d.mailsPorAsunto.map((m:any) => m.asunto.length > 30 ? m.asunto.substring(0,30)+'...' : m.asunto),
      datasets: [
        { label: 'Total', data: d.mailsPorAsunto.map((m:any) => m.total), backgroundColor: '#4fc3f7' },
        { label: 'Fallidos', data: d.mailsPorAsunto.map((m:any) => m.fallidos), backgroundColor: '#ef5350' },
      ],
    };
  }
  getMailsProvincia(d: any): ChartData<'bar'> {
    const p = d.provincias.filter((x:any) => x.mailsTotal > 0);
    return {
      labels: p.map((x:any) => x.nombre),
      datasets: [
        { label: 'Mails Totales', data: p.map((x:any) => x.mailsTotal), backgroundColor: '#4fc3f7' },
        { label: 'Mails Fallidos', data: p.map((x:any) => x.mailsFallidos), backgroundColor: '#ef5350' },
      ],
    };
  }
}
