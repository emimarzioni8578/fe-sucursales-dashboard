import { Directive, Input } from '@angular/core';

/**
 * Drop-in replacement for ng2-charts' BaseChartDirective in tests.
 * Same selector and inputs, but renders nothing — so chart pages can be
 * rendered in jsdom without a real <canvas> 2D context.
 */
@Directive({ selector: 'canvas[baseChart]', standalone: true })
export class MockBaseChartDirective {
  @Input() type: unknown;
  @Input() legend: unknown;
  @Input() data: unknown;
  @Input() options: unknown;
  @Input() plugins: unknown;
  @Input() labels: unknown;
  @Input() datasets: unknown;
}
