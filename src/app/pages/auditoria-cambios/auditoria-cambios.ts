import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardSource } from '@services/dashboard-source';
import { KpiCardComponent } from '@components/kpi-card/kpi-card';
import type { DashboardData, AuditMes, AuditTabla } from '@models/data-models.model';
import { AUDIT_ACTIONS, AUDIT_ACTION_COLORS, emptyChart } from '@shared/chart-theme';

@Component({
  selector: 'app-auditoria-cambios',
  standalone: true,
  imports: [MatCardModule, BaseChartDirective, KpiCardComponent],
  templateUrl: './auditoria-cambios.html',
  styleUrl: './auditoria-cambios.scss',
})
export class AuditoriaCambiosComponent {
  private data = inject(DashboardSource);
  d = toSignal(this.data.data$);
  barType: ChartType = 'bar';
  stackedOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } };

  /** Claves de acción presentes en los datos (minúscula); usado para construir las series. */
  actionTypes = AUDIT_ACTIONS.map(a => a.key);

  auditMesData = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getAuditMesData(d) : emptyChart<'bar'>(); });
  auditTablaData = computed<ChartData<'bar'>>(() => { const d = this.d(); return d ? this.getAuditTablaData(d) : emptyChart<'bar'>(); });

  getAuditMesData(d: DashboardData): ChartData<'bar'> {
    return {
      labels: d.auditPorMes.map(a => a.mes),
      datasets: this.actionDatasets(d.auditPorMes),
    };
  }
  getAuditTablaData(d: DashboardData): ChartData<'bar'> {
    return {
      labels: d.auditPorTabla.map(a => a.tabla),
      datasets: this.actionDatasets(d.auditPorTabla),
    };
  }

  /** Una serie apilada por cada acción de auditoría, leyendo la columna dinámica del row. */
  private actionDatasets(rows: (AuditMes | AuditTabla)[]): ChartData<'bar'>['datasets'] {
    return AUDIT_ACTIONS.map((action, i) => ({
      label: action.label,
      data: rows.map(r => (r[action.key] as number) || 0),
      backgroundColor: AUDIT_ACTION_COLORS[i],
    }));
  }
}
