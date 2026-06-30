import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BaseChartDirective } from 'ng2-charts';
import { ResumenEjecutivoComponent } from './resumen-ejecutivo';
import { DashboardSource } from '@services/dashboard-source';
import { MockBaseChartDirective } from '@testing/mock-chart';
import { createMockDataService, makeDashboardData } from '@testing/mocks';

describe('ResumenEjecutivoComponent', () => {
  let fixture: ComponentFixture<ResumenEjecutivoComponent>;
  let cmp: ResumenEjecutivoComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenEjecutivoComponent],
      providers: [provideNoopAnimations(), { provide: DashboardSource, useValue: createMockDataService() }],
    })
      .overrideComponent(ResumenEjecutivoComponent, {
        remove: { imports: [BaseChartDirective] },
        add: { imports: [MockBaseChartDirective] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(ResumenEjecutivoComponent);
    cmp = fixture.componentInstance;
  });

  it('renders KPIs and charts without a real canvas', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Resumen Ejecutivo');
    expect(text).toContain('Total Sucursales');
  });

  it('getBarData maps provincias to three stacked datasets', () => {
    const bar = cmp.getBarData(makeDashboardData());
    expect(bar.labels).toEqual(['Buenos Aires', 'Cordoba']);
    expect(bar.datasets.length).toBe(3);
  });

  it('getEstadoData builds a 3-slice doughnut from state counts', () => {
    const dn = cmp.getEstadoData(makeDashboardData({ activas: 3, inactivas: 1, pendientes: 1 }));
    expect(dn.datasets[0].data).toEqual([3, 1, 1]);
  });

  it('getCompMesData maps the monthly compensation series', () => {
    const line = cmp.getCompMesData(makeDashboardData());
    expect(line.labels).toEqual(['2024-01', '2024-02']);
    expect(line.datasets.length).toBe(2);
  });
});
