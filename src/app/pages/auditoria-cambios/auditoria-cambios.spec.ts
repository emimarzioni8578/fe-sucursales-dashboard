import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BaseChartDirective } from 'ng2-charts';
import { AuditoriaCambiosComponent } from './auditoria-cambios';
import { DataService } from '../../services/data';
import { MockBaseChartDirective } from '../../testing/mock-chart';
import { createMockDataService, makeDashboardData } from '../../testing/mocks';

describe('AuditoriaCambiosComponent', () => {
  let fixture: ComponentFixture<AuditoriaCambiosComponent>;
  let cmp: AuditoriaCambiosComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriaCambiosComponent],
      providers: [provideNoopAnimations(), { provide: DataService, useValue: createMockDataService() }],
    })
      .overrideComponent(AuditoriaCambiosComponent, {
        remove: { imports: [BaseChartDirective] },
        add: { imports: [MockBaseChartDirective] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(AuditoriaCambiosComponent);
    cmp = fixture.componentInstance;
  });

  it('renders the audit KPIs', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Auditoría y Cambios');
    expect(text).toContain('Eventos de Auditoría');
  });

  it('getAuditMesData builds one dataset per action type', () => {
    const bar = cmp.getAuditMesData(makeDashboardData());
    expect(bar.labels).toEqual(['2024-01']);
    expect(bar.datasets.length).toBe(cmp.actionTypes.length);
    // first row has insert:2 -> the "Insert" dataset starts with 2, others default to 0
    expect(bar.datasets[0].data).toEqual([2]);
    expect(bar.datasets[2].data).toEqual([0]); // SoftDelete not present
  });

  it('getAuditTablaData maps tables to action datasets', () => {
    const bar = cmp.getAuditTablaData(makeDashboardData());
    expect(bar.labels).toEqual(['sucursales']);
    expect(bar.datasets.length).toBe(cmp.actionTypes.length);
  });
});
