import { Component, ViewChild, AfterViewInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardSource } from '@services/dashboard-source';
import { exportToCsv } from '@services/export.util';
import type { ProvinciaData } from '@models/data-models.model';

@Component({
  selector: 'app-operacion-territorial',
  standalone: true,
  imports: [
    MatCardModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatChipsModule, MatButtonModule, MatIconModule, MatTooltipModule,
  ],
  templateUrl: './operacion-territorial.html',
  styleUrl: './operacion-territorial.scss',
})
export class OperacionTerritorialComponent implements AfterViewInit {
  private data = inject(DashboardSource);
  private router = inject(Router);
  dataSource = new MatTableDataSource<ProvinciaData>([]);
  displayedColumns = ['nombre', 'region', 'total', 'activas', 'inactivas', 'pendientes', 'pctActivas', 'pctCoberturaDist', 'pctCoberturaSocial', 'compAbiertas'];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    this.data.data$.pipe(takeUntilDestroyed()).subscribe(d => {
      this.dataSource.data = d.provincias;
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  /** Drill-down: filtra por la provincia y navega al listado de sucursales. */
  verSucursales(p: ProvinciaData): void {
    this.data.setFilter({ provincia: p.provinciaId, region: null, estado: null });
    this.router.navigate(['/sucursales']);
  }

  exportar(): void {
    exportToCsv('sucursales_por_provincia.csv', this.dataSource.filteredData, [
      { key: 'nombre', header: 'Provincia' }, { key: 'region', header: 'Región' },
      { key: 'total', header: 'Total' }, { key: 'activas', header: 'Activas' },
      { key: 'inactivas', header: 'Inactivas' }, { key: 'pendientes', header: 'Pendientes' },
      { key: 'pctActivas', header: '% Activas' }, { key: 'pctCoberturaDist', header: '% Cobertura Dist' },
      { key: 'pctCoberturaSocial', header: '% Cobertura Social' }, { key: 'compAbiertas', header: 'Comp Abiertas' },
    ]);
  }
}
