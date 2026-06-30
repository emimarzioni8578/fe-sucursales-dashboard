import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card class="kpi-card" [class]="color">
      <mat-card-content>
        <div class="label">{{label}}</div>
        <div class="value-row">
          <span class="value">{{value}}</span>
          @if (hasTrend) {
            <span class="trend" [class]="trendClass">{{trendArrow}} {{trendAbs}}%</span>
          }
        </div>
        @if (sub) { <div class="sub">{{sub}}</div> }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .kpi-card { border-radius: 12px; border-left: 4px solid #4fc3f7; }
    .kpi-card.blue { border-left-color: #4fc3f7; }
    .kpi-card.green { border-left-color: #66bb6a; }
    .kpi-card.orange { border-left-color: #ffa726; }
    .kpi-card.red { border-left-color: #ef5350; }
    .kpi-card.purple { border-left-color: #ab47bc; }
    .kpi-card.teal { border-left-color: #26a69a; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 6px; }
    .value-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
    .value { font-size: 28px; font-weight: 700; color: var(--mat-sys-on-surface, #1a1a2e); }
    .trend { font-size: 13px; font-weight: 600; }
    .trend.up { color: #2e7d32; }
    .trend.down { color: #c62828; }
    .trend.up.inverse { color: #c62828; }
    .trend.down.inverse { color: #2e7d32; }
    .trend.flat { color: #999; }
    .sub { font-size: 12px; color: #888; margin-top: 4px; }
  `]
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() sub = '';
  @Input() color = 'blue';
  /** Optional month-over-month % change. Renders an ▲/▼ indicator. */
  @Input() trend?: number;
  /** When true, an upward trend is "bad" (red) — e.g. fallos, compensaciones abiertas. */
  @Input() trendInverse = false;

  get hasTrend(): boolean { return this.trend !== undefined && this.trend !== null && !isNaN(this.trend); }
  get trendAbs(): number { return Math.abs(this.trend ?? 0); }
  get trendClass(): string {
    const t = this.trend ?? 0;
    const dir = t > 0 ? 'up' : (t < 0 ? 'down' : 'flat');
    return this.trendInverse ? `${dir} inverse` : dir;
  }
  get trendArrow(): string {
    const t = this.trend ?? 0;
    return t > 0 ? '▲' : (t < 0 ? '▼' : '▬');
  }
}
