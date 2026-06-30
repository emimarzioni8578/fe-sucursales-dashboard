import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BaseChartDirective } from 'ng2-charts';
import { CalidadDatosComponent } from './calidad-datos';
import { DataService } from '../../services/data';
import { MockBaseChartDirective } from '../../testing/mock-chart';
import { createMockDataService, makeDashboardData } from '../../testing/mocks';
import type { SucursalIssue } from '../../models/data-models.model';

const issue = (over: Partial<SucursalIssue> = {}): SucursalIssue => ({
  id: 'S2', nombre: 'Sucursal Dos', provincia: 'Cordoba', estado: 'Inactiva',
  sinCoord: false, coordInvalida: true, sinDist: true, sinSocial: true, ...over,
});

describe('CalidadDatosComponent', () => {
  let fixture: ComponentFixture<CalidadDatosComponent>;
  let cmp: CalidadDatosComponent;

  beforeEach(async () => {
    const data = createMockDataService(makeDashboardData({
      sucursalesConProblemas: [issue(), issue({ id: 'S3', nombre: 'Sucursal Tres', sinCoord: true, coordInvalida: false })],
    }));
    await TestBed.configureTestingModule({
      imports: [CalidadDatosComponent],
      providers: [provideNoopAnimations(), { provide: DataService, useValue: data }],
    })
      .overrideComponent(CalidadDatosComponent, {
        remove: { imports: [BaseChartDirective] },
        add: { imports: [MockBaseChartDirective] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(CalidadDatosComponent);
    cmp = fixture.componentInstance;
  });

  it('renders and loads the issues table', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Calidad de Datos');
    expect(cmp.issues.data.length).toBe(2);
  });

  it('getCoberturaData maps coverage per province', () => {
    const bar = cmp.getCoberturaData(makeDashboardData());
    expect(bar.labels).toEqual(['Buenos Aires', 'Cordoba']);
    expect(bar.datasets.length).toBe(2);
  });

  it('issues filterPredicate matches by name/province/estado', () => {
    expect(cmp.issues.filterPredicate(issue({ nombre: 'Sucursal Dos' }), 'dos')).toBe(true);
    expect(cmp.issues.filterPredicate(issue({ provincia: 'Cordoba' }), 'cordoba')).toBe(true);
    expect(cmp.issues.filterPredicate(issue(), 'inexistente')).toBe(false);
  });

  it('applyFilter lowercases the term', () => {
    cmp.applyFilter('  CÓRDOBA  ');
    expect(cmp.issues.filter).toBe('córdoba');
  });

  it('exports the issues list without throwing', () => {
    fixture.detectChanges();
    expect(() => cmp.exportarProblemas()).not.toThrow();
  });
});
