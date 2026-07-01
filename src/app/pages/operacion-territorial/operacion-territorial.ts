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
import { MatDialog } from '@angular/material/dialog';
import { DashboardSource } from '@services/dashboard-source';
import { exportToCsv } from '@services/export.util';
import { provinciaBenchmark, type NetworkMetrics } from '@services/aggregations';
import { ProvinciaDetailDialog } from '@components/provincia-detail/provincia-detail';
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
  private dialog = inject(MatDialog);
  dataSource = new MatTableDataSource<ProvinciaData>([]);
  displayedColumns = ['nombre', 'region', 'total', 'activas', 'inactivas', 'pendientes', 'pctActivas', 'pctCoberturaDist', 'pctCoberturaSocial', 'compAbiertas'];

  /** Promedios de red vigentes, para comparar cada provincia en el drill-down. */
  private net: NetworkMetrics = { pctActivas: 0, pctCobDist: 0, pctCobSocial: 0, pctMailsFallidos: 0 };

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    this.data.data$.pipe(takeUntilDestroyed()).subscribe(d => {
      this.dataSource.data = d.provincias;
      this.net = {
        pctActivas: d.pctActivas, pctCobDist: d.pctCobDist,
        pctCobSocial: d.pctCobSocial, pctMailsFallidos: d.pctMailsFallidos,
      };
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  /** Drill-down: abre el detalle de la provincia con su benchmark contra la red. */
  openProvincia(p: ProvinciaData): void {
    const ref = this.dialog.open(ProvinciaDetailDialog, {
      data: { provincia: p, benchmark: provinciaBenchmark(p, this.net) },
      width: '520px', maxWidth: '95vw',
    });
    ref.afterClosed().subscribe(result => {
      if (result === 'ver-sucursales') this.verSucursales(p);
    });
  }

  /** Drill-down: filtra por la provincia y navega al listado de sucursales. */
  verSucursales(p: ProvinciaData): void {
    this.data.setFilter({ provincia: p.provinciaId, region: null, estado: null });
    // El query param mantiene la URL compartible y evita que el sync la interprete como "limpiar".
    this.router.navigate(['/sucursales'], { queryParams: { provincia: p.provinciaId } });
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
