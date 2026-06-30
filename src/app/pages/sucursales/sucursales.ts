import { Component, ViewChild, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../../services/data';
import { exportToCsv } from '../../services/export.util';
import { SucursalDetailDialog } from '../../components/sucursal-detail/sucursal-detail';
import type { SucursalRow } from '../../models/data-models.model';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [
    AsyncPipe, MatCardModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatChipsModule,
  ],
  templateUrl: './sucursales.html',
  styleUrl: './sucursales.scss',
})
export class SucursalesComponent {
  data = inject(DataService);
  private dialog = inject(MatDialog);
  activeFilter$ = this.data.activeFilter$;

  dataSource = new MatTableDataSource<SucursalRow>([]);
  displayedColumns = ['id', 'nombre', 'provincia', 'localidad', 'estado', 'compAbiertas', 'mailsFallidos', 'riesgo'];

  @ViewChild(MatSort) set sortSetter(s: MatSort | undefined) { if (s) this.dataSource.sort = s; }
  @ViewChild(MatPaginator) set paginatorSetter(p: MatPaginator | undefined) { if (p) this.dataSource.paginator = p; }

  constructor() {
    this.dataSource.filterPredicate = (s, term) =>
      `${s.id} ${s.nombre} ${s.provincia} ${s.localidad} ${s.estado} ${s.email}`.toLowerCase().includes(term);
    this.data.data$.pipe(takeUntilDestroyed()).subscribe(d => {
      this.dataSource.data = d.sucursales;
    });
  }

  applyFilter(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  openDetail(row: SucursalRow): void {
    this.dialog.open(SucursalDetailDialog, { data: row, width: '520px', maxWidth: '95vw' });
  }

  clearFilter(): void { this.data.clearFilter(); }

  exportar(): void {
    exportToCsv('sucursales.csv', this.dataSource.filteredData, [
      { key: 'id', header: 'ID' }, { key: 'nombre', header: 'Sucursal' },
      { key: 'provincia', header: 'Provincia' }, { key: 'region', header: 'Región' },
      { key: 'localidad', header: 'Localidad' }, { key: 'estado', header: 'Estado' },
      { key: 'email', header: 'Email' }, { key: 'telefono', header: 'Teléfono' },
      { key: 'compAbiertas', header: 'Comp Abiertas' }, { key: 'compTotal', header: 'Comp Totales' },
      { key: 'mailsFallidos', header: 'Mails Fallidos' }, { key: 'riesgo', header: 'Riesgo' },
    ]);
  }
}
