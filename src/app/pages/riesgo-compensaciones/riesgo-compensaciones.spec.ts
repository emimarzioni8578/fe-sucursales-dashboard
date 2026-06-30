import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BaseChartDirective } from 'ng2-charts';
import { RiesgoCompensacionesComponent } from './riesgo-compensaciones';
import { DashboardSource } from '@services/dashboard-source';
import { MockBaseChartDirective } from '@testing/mock-chart';
import { createMockDataService, makeDashboardData } from '@testing/mocks';

describe('RiesgoCompensacionesComponent', () => {
  let fixture: ComponentFixture<RiesgoCompensacionesComponent>;
  let cmp: RiesgoCompensacionesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiesgoCompensacionesComponent],
      providers: [provideNoopAnimations(), { provide: DashboardSource, useValue: createMockDataService() }],
    })
      .overrideComponent(RiesgoCompensacionesComponent, {
        remove: { imports: [BaseChartDirective] },
        add: { imports: [MockBaseChartDirective] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(RiesgoCompensacionesComponent);
    cmp = fixture.componentInstance;
  });

  it('renders KPIs and the aging section', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Riesgo y Compensaciones');
    expect(text).toContain('aging');
    expect(text).toContain('Más de 30 días');
  });

  it('getEstadoData returns the four compensation states', () => {
    const dn = cmp.getEstadoData(makeDashboardData({
      compPendientes: 3, compEnRevision: 0, compAprobadas: 1, compRechazadas: 0,
    }));
    expect(dn.datasets[0].data).toEqual([3, 0, 1, 0]);
  });

  it('getErrorData maps error types', () => {
    const bar = cmp.getErrorData(makeDashboardData());
    expect(bar.labels).toEqual(['Timeout', 'Validation']);
    expect(bar.datasets[0].data).toEqual([1, 1]);
  });

  it('getCompMesData splits open vs closed', () => {
    const bar = cmp.getCompMesData(makeDashboardData());
    expect(bar.datasets.map(ds => ds.label)).toEqual(['Abiertas', 'Cerradas']);
    // mes 2024-02: total 3, abiertas 2 -> cerradas 1
    expect(bar.datasets[1].data).toEqual([1, 1]);
  });
});
