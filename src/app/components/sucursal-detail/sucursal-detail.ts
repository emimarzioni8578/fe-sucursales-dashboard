import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { RatingStarsComponent } from '@components/rating-stars/rating-stars';
import type { SucursalRow } from '@models/data-models.model';

@Component({
  selector: 'app-sucursal-detail',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, RatingStarsComponent],
  templateUrl: './sucursal-detail.html',
  styleUrl: './sucursal-detail.scss',
})
export class SucursalDetailDialog {
  s = inject<SucursalRow>(MAT_DIALOG_DATA);
}
