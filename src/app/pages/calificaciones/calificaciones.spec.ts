import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BaseChartDirective } from 'ng2-charts';
import { CalificacionesComponent } from './calificaciones';
import { DashboardSource } from '@services/dashboard-source';
import { MockBaseChartDirective } from '@testing/mock-chart';
import { createMockDataService, makeDashboardData, makeProvinciaData, makeSucursalRow } from '@testing/mocks';

const data = makeDashboardData({
  ratingPromedioRed: 3.9, ratingVotos: 30, sucCalificadas: 3, pctCalificadas: 60,
  ratingBajas: 1, ratingDistribucion: [1, 2, 3, 8, 10],
  sucursales: [
    makeSucursalRow({ id: 'A', nombre: 'Alta', ratingAverage: 4.5, ratingCount: 10 }),
    makeSucursalRow({ id: 'B', nombre: 'Baja', ratingAverage: 2.1, ratingCount: 8, riesgo: 6 }),
    makeSucursalRow({ id: 'C', nombre: 'Nueva', ratingAverage: 5, ratingCount: 2 }),
  ],
  provincias: [
    makeProvinciaData({ provinciaId: 'P1', nombre: 'Buenos Aires', ratingAverage: 4.1, ratingVotos: 20 }),
    makeProvinciaData({ provinciaId: 'P2', nombre: 'Cordoba', ratingAverage: 3.2, ratingVotos: 10 }),
    makeProvinciaData({ provinciaId: 'P3', nombre: 'Salta', ratingAverage: null, ratingVotos: 0 }),
  ],
});

describe('CalificacionesComponent', () => {
  let fixture: ComponentFixture<CalificacionesComponent>;
  let cmp: CalificacionesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalificacionesComponent],
      providers: [provideNoopAnimations(), { provide: DashboardSource, useValue: createMockDataService(data) }],
    })
      .overrideComponent(CalificacionesComponent, {
        remove: { imports: [BaseChartDirective] },
        add: { imports: [MockBaseChartDirective] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(CalificacionesComponent);
    cmp = fixture.componentInstance;
  });

  it('renders the scoring KPIs', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Calificaciones');
    expect(text).toContain('Promedio de la Red');
    expect(text).toContain('3.9 ★');
    expect(text).toContain('Rating Bajo');
  });

  it('getDistribucionData builds the Google-style histogram (5★ first)', () => {
    const bar = cmp.getDistribucionData(data);
    expect(bar.labels).toEqual(['5★', '4★', '3★', '2★', '1★']);
    expect(bar.datasets[0].data).toEqual([10, 8, 3, 2, 1]);
  });

  it('getProvinciaData sorts rated provinces best-first and skips unrated ones', () => {
    const bar = cmp.getProvinciaData(data);
    expect(bar.labels).toEqual(['Buenos Aires', 'Cordoba']); // Salta sin votos queda afuera
    expect(bar.datasets[0].data).toEqual([4.1, 3.2]);
  });

  it('ranks top and bottom applying the vote threshold', () => {
    expect(cmp.top().map(s => s.id)).toEqual(['A', 'B']);    // C queda fuera (2 votos)
    expect(cmp.bottom().map(s => s.id)).toEqual(['B', 'A']);
  });

  it('flags critical branches (low rating + risk)', () => {
    expect(cmp.criticas().map(s => s.id)).toEqual(['B']);
  });

  it('computes the delta against the network average', () => {
    expect(cmp.deltaRed(data.provincias[0])).toBe(0.2);  // 4.1 - 3.9
    expect(cmp.deltaRed(data.provincias[1])).toBe(-0.7); // 3.2 - 3.9
    expect(cmp.deltaRed(data.provincias[2])).toBeNull(); // sin votos
  });

  it('renders the ranking lists and the provincia table', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Mejores sucursales');
    expect(text).toContain('Peores sucursales');
    expect(text).toContain('Alta');
    expect(text).toContain('Detalle por provincia');
    expect(text).toContain('Salta');
    expect(text).toContain('Sin calificaciones'); // provincia sin votos, nunca 0★
  });
});
