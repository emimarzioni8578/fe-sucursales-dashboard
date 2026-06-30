import { Component, ViewChild, computed, inject } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardSource } from '@services/dashboard-source';
import { exportToCsv } from '@services/export.util';
import type { DashboardData, SucursalIssue } from '@models/data-models.model';
import { PALETTE, emptyChart } from '@shared/chart-theme';

@Component({
  selector: 'app-calidad-datos',
  standalone: true,
  imports: [
    MatCardModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatChipsModule,
    BaseChartDirective,
  ],
  templateUrl: './calidad-datos.html',
  styleUrl: './calidad-datos.scss',
})
export class CalidadDatosComponent {
  private data = inject(DashboardSource);
  d = toSignal(this.data.data$);
  barType: ChartType = 'bar';
  barOptions: ChartConfiguration['options'] = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, max: 100 } } };
  displayedColumns = ['nombre', 'total', 'sinSocial', 'sinDist', 'sinCoord', 'pctCoberturaSocial', 'pctCoberturaDist'];

  issues = new MatTableDataSource<SucursalIssue>([]);
  issueColumns = ['id', 'nombre', 'provincia', 'estado', 'problemas'];

  coberturaData = computed<ChartData<'bar'>>(() => {
    const d = this.d();
    return d ? this.getCoberturaData(d) : emptyChart<'bar'>();
  });

  @ViewChild(MatSort) set sortSetter(s: MatSort | undefined) { if (s) this.issues.sort = s; }
  @ViewChild(MatPaginator) set paginatorSetter(p: MatPaginator | undefined) { if (p) this.issues.paginator = p; }

  constructor() {
    this.issues.filterPredicate = (s, term) =>
      `${s.id} ${s.nombre} ${s.provincia} ${s.estado}`.toLowerCase().includes(term);
    this.data.data$.pipe(takeUntilDestroyed()).subscribe(d => {
      this.issues.data = d.sucursalesConProblemas;
    });
  }

  applyFilter(value: string): void {
    this.issues.filter = value.trim().toLowerCase();
    this.issues.paginator?.firstPage();
  }

  exportarProblemas(): void {
    const yn = (b: boolean) => (b ? 'Sí' : 'No');
    exportToCsv('sucursales_con_problemas.csv', this.issues.filteredData.map(s => ({
      id: s.id, nombre: s.nombre, provincia: s.provincia, estado: s.estado,
      sinCoord: yn(s.sinCoord), coordInvalida: yn(s.coordInvalida), sinDist: yn(s.sinDist), sinSocial: yn(s.sinSocial),
    })), [
      { key: 'id', header: 'ID' }, { key: 'nombre', header: 'Sucursal' },
      { key: 'provincia', header: 'Provincia' }, { key: 'estado', header: 'Estado' },
      { key: 'sinCoord', header: 'Sin coordenadas' }, { key: 'coordInvalida', header: 'Coord. inválida' },
      { key: 'sinDist', header: 'Sin distribuidor' }, { key: 'sinSocial', header: 'Sin red social' },
    ]);
  }

  getCoberturaData(d: DashboardData): ChartData<'bar'> {
    return {
      labels: d.provincias.map(p => p.nombre),
      datasets: [
        { label: 'Cobertura Social (%)', data: d.provincias.map(p => p.pctCoberturaSocial), backgroundColor: PALETTE.purple },
        { label: 'Cobertura Distribuidor (%)', data: d.provincias.map(p => p.pctCoberturaDist), backgroundColor: PALETTE.teal },
      ],
    };
  }
}
