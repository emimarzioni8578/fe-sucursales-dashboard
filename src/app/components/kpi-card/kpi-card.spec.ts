import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { KpiCardComponent } from './kpi-card';

describe('KpiCardComponent', () => {
  let fixture: ComponentFixture<KpiCardComponent>;
  let cmp: KpiCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiCardComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(KpiCardComponent);
    cmp = fixture.componentInstance;
  });

  it('creates', () => {
    expect(cmp).toBeTruthy();
  });

  it('hasTrend is false when no trend is provided', () => {
    expect(cmp.hasTrend).toBe(false);
  });

  it('hasTrend is false for NaN', () => {
    cmp.trend = NaN;
    expect(cmp.hasTrend).toBe(false);
  });

  it('hasTrend is true (even for zero) when a numeric trend is set', () => {
    cmp.trend = 0;
    expect(cmp.hasTrend).toBe(true);
  });

  it('trendAbs returns the absolute value', () => {
    cmp.trend = -12.5;
    expect(cmp.trendAbs).toBe(12.5);
  });

  it('trendArrow reflects direction', () => {
    cmp.trend = 5; expect(cmp.trendArrow).toBe('▲');
    cmp.trend = -5; expect(cmp.trendArrow).toBe('▼');
    cmp.trend = 0; expect(cmp.trendArrow).toBe('▬');
  });

  it('trendClass is up/down/flat without inverse', () => {
    cmp.trend = 5; expect(cmp.trendClass).toBe('up');
    cmp.trend = -5; expect(cmp.trendClass).toBe('down');
    cmp.trend = 0; expect(cmp.trendClass).toBe('flat');
  });

  it('trendClass appends "inverse" when trendInverse is set', () => {
    cmp.trendInverse = true;
    cmp.trend = 5; expect(cmp.trendClass).toBe('up inverse');
    cmp.trend = -5; expect(cmp.trendClass).toBe('down inverse');
  });

  it('renders the label and value in the DOM', () => {
    cmp.label = 'Total';
    cmp.value = 800;
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Total');
    expect(text).toContain('800');
  });
});
