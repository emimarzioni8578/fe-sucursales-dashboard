import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BaseChartDirective } from 'ng2-charts';
import { EmailsVerificacionComponent } from './emails-verificacion';
import { DashboardSource } from '@services/dashboard-source';
import { MockBaseChartDirective } from '@testing/mock-chart';
import { createMockDataService, makeDashboardData } from '@testing/mocks';

describe('EmailsVerificacionComponent', () => {
  let fixture: ComponentFixture<EmailsVerificacionComponent>;
  let cmp: EmailsVerificacionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailsVerificacionComponent],
      providers: [provideNoopAnimations(), { provide: DashboardSource, useValue: createMockDataService() }],
    })
      .overrideComponent(EmailsVerificacionComponent, {
        remove: { imports: [BaseChartDirective] },
        add: { imports: [MockBaseChartDirective] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(EmailsVerificacionComponent);
    cmp = fixture.componentInstance;
  });

  it('renders the mail KPIs', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Emails y Verificación');
    expect(text).toContain('Mails Totales');
  });

  it('getMailsEstado computes sent/failed/other slices', () => {
    const dn = cmp.getMailsEstado(makeDashboardData({ totalMails: 4, mailsEnviados: 2, mailsFallidos: 1 }));
    expect(dn.datasets[0].data).toEqual([2, 1, 1]); // otros = 4-2-1
  });

  it('getMailsAsunto maps subjects to totals and failures', () => {
    const bar = cmp.getMailsAsunto(makeDashboardData());
    expect(bar.labels).toEqual(['Bienvenida']);
    expect(bar.datasets.length).toBe(2);
  });

  it('getMailsProvincia includes only provinces with mails', () => {
    const bar = cmp.getMailsProvincia(makeDashboardData());
    expect(bar.labels?.length).toBe(2);
  });
});
