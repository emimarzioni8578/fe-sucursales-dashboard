import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataService, DashboardFilter } from '../../services/data';
import { presetRange, RangePreset, RANGE_PRESETS } from '../../services/date-presets.util';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [AsyncPipe, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class FilterBarComponent {
  private data = inject(DataService);
  options$ = this.data.filterOptions$;
  active$ = this.data.activeFilter$;
  presets = RANGE_PRESETS;

  set(key: keyof DashboardFilter, value: string | null): void {
    this.data.setFilter({ [key]: value || null });
  }

  applyPreset(p: RangePreset): void {
    this.data.setFilter(presetRange(p));
  }

  /** True when the active date range exactly matches the given preset (computed for "today"). */
  isActivePreset(key: RangePreset, af: DashboardFilter): boolean {
    if (!af.desde || !af.hasta) return false;
    const r = presetRange(key);
    return r.desde === af.desde && r.hasta === af.hasta;
  }

  clear(): void { this.data.clearFilter(); }
}
