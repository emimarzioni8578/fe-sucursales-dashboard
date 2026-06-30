import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DataService } from '../../services/data';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';

@Component({
  selector: 'app-auditoria-cambios',
  standalone: true,
  imports: [AsyncPipe, MatCardModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './auditoria-cambios.html',
  styleUrl: './auditoria-cambios.scss',
})
export class AuditoriaCambiosComponent {
  data = inject(DataService);
  data$ = this.data.data$;
  barType: ChartType = 'bar';
  stackedOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } };

  actionTypes = ['insert','update','softdelete','bulkinsert','bulkupdate','delete'];
  actionLabels = ['Insert','Update','SoftDelete','BulkInsert','BulkUpdate','Delete'];
  actionColors = ['#66bb6a','#ffa726','#ef5350','#ab47bc','#4fc3f7','#90a4ae'];

  getAuditMesData(d: any): ChartData<'bar'> {
    return {
      labels: d.auditPorMes.map((a:any) => a.mes),
      datasets: this.actionTypes.map((act, i) => ({
        label: this.actionLabels[i], data: d.auditPorMes.map((a:any) => a[act] || 0), backgroundColor: this.actionColors[i],
      })),
    };
  }
  getAuditTablaData(d: any): ChartData<'bar'> {
    return {
      labels: d.auditPorTabla.map((a:any) => a.tabla),
      datasets: this.actionTypes.map((act, i) => ({
        label: this.actionLabels[i], data: d.auditPorTabla.map((a:any) => a[act] || 0), backgroundColor: this.actionColors[i],
      })),
    };
  }
}
