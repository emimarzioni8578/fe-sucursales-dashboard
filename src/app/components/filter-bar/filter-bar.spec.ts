import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FilterBarComponent } from './filter-bar';
import { DashboardSource, DashboardFilter } from '@services/dashboard-source';
import { presetRange } from '@services/date-presets.util';
import { createMockDataService } from '@testing/mocks';

const filterWith = (over: Partial<DashboardFilter> = {}): DashboardFilter =>
  ({ provincia: null, region: null, estado: null, desde: null, hasta: null, ...over });

describe('FilterBarComponent', () => {
  let fixture: ComponentFixture<FilterBarComponent>;
  let cmp: FilterBarComponent;
  let data: DashboardSource;

  beforeEach(async () => {
    data = createMockDataService();
    await TestBed.configureTestingModule({
      imports: [FilterBarComponent],
      providers: [provideNoopAnimations(), { provide: DashboardSource, useValue: data }],
    }).compileComponents();
    fixture = TestBed.createComponent(FilterBarComponent);
    cmp = fixture.componentInstance;
  });

  it('creates', () => {
    expect(cmp).toBeTruthy();
  });

  it('forwards a selected value to setFilter', () => {
    cmp.set('region', 'Centro');
    expect(data.setFilter).toHaveBeenCalledWith({ region: 'Centro' });
  });

  it('maps an empty selection to null', () => {
    cmp.set('provincia', '');
    expect(data.setFilter).toHaveBeenCalledWith({ provincia: null });
  });

  it('clear() delegates to the service', () => {
    cmp.clear();
    expect(data.clearFilter).toHaveBeenCalled();
  });

  it('applyPreset sets a desde/hasta range on the service', () => {
    cmp.applyPreset('last30');
    expect(data.setFilter).toHaveBeenCalledTimes(1);
    const arg = (data.setFilter as any).mock.calls[0][0];
    expect(typeof arg.desde).toBe('string');
    expect(typeof arg.hasta).toBe('string');
    expect(arg.desde <= arg.hasta).toBe(true);
  });

  it('exposes the available presets to the template', () => {
    expect(cmp.presets.length).toBe(3);
  });

  it('isActivePreset matches the range produced by that preset', () => {
    const r = presetRange('last30');
    expect(cmp.isActivePreset('last30', filterWith({ desde: r.desde, hasta: r.hasta }))).toBe(true);
    expect(cmp.isActivePreset('last90', filterWith({ desde: r.desde, hasta: r.hasta }))).toBe(false);
  });

  it('isActivePreset is false when no date range is set', () => {
    expect(cmp.isActivePreset('last30', filterWith())).toBe(false);
  });

  it('renders the three filter selects', () => {
    fixture.detectChanges();
    const labels = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(labels).toContain('Región');
    expect(labels).toContain('Provincia');
    expect(labels).toContain('Estado');
  });
});
