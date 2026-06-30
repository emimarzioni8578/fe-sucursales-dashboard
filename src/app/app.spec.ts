import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AppComponent } from './app';
import { DashboardSource } from './services/dashboard-source';
import { createMockDataService, makeSucursalRow } from './testing/mocks';

describe('AppComponent', () => {
  let cmp: AppComponent;
  let data: DashboardSource;
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    dialog.open.mockClear();
    localStorage.clear();
    document.body.classList.remove('dark-theme');
    data = createMockDataService();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: DashboardSource, useValue: data },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    cmp = TestBed.createComponent(AppComponent).componentInstance;
  });

  it('creates', () => {
    expect(cmp).toBeTruthy();
  });

  it('defaults to the light theme', () => {
    expect(cmp.dark()).toBe(false);
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('toggleTheme switches the dark theme on and off and persists it', () => {
    cmp.toggleTheme();
    expect(cmp.dark()).toBe(true);
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    expect(localStorage.getItem('sucursales-theme')).toBe('dark');

    cmp.toggleTheme();
    expect(cmp.dark()).toBe(false);
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('onSearch populates results from the service', () => {
    cmp.onSearch('suc');
    expect(data.searchSucursales).toHaveBeenCalledWith('suc', 8);
    expect(cmp.searchResults().length).toBeGreaterThan(0);
  });

  it('openResult opens the detail dialog and clears results', () => {
    cmp.searchResults.set([makeSucursalRow()]);
    cmp.openResult(makeSucursalRow({ id: 'S9' }));
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(cmp.searchResults()).toEqual([]);
  });
});
