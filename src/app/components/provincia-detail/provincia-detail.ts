import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import type { ProvinciaData } from '@models/data-models.model';
import type { BenchmarkRow } from '@services/aggregations';

/** Payload del diálogo: la provincia y su comparación ya calculada contra la red. */
export interface ProvinciaDetailData {
  provincia: ProvinciaData;
  benchmark: BenchmarkRow[];
}

@Component({
  selector: 'app-provincia-detail',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './provincia-detail.html',
  styleUrl: './provincia-detail.scss',
})
export class ProvinciaDetailDialog {
  data = inject<ProvinciaDetailData>(MAT_DIALOG_DATA);
  get p(): ProvinciaData { return this.data.provincia; }
  get benchmark(): BenchmarkRow[] { return this.data.benchmark; }

  /** Ícono/sentido del delta según si en esa métrica subir es bueno o malo. */
  isGood(row: BenchmarkRow): boolean {
    if (row.delta === 0) return true;
    return row.higherIsBetter ? row.delta > 0 : row.delta < 0;
  }
}
