import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { SucursalesComponent } from './sucursales';
import { DashboardSource } from '@services/dashboard-source';
import { createMockDataService, makeDashboardData, makeSucursalRow } from '@testing/mocks';

describe('SucursalesComponent', () => {
  let cmp: SucursalesComponent;
  let data: DashboardSource;
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    dialog.open.mockClear();
    data = createMockDataService(makeDashboardData());
    await TestBed.configureTestingModule({
      imports: [SucursalesComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DashboardSource, useValue: data },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    cmp = TestBed.createComponent(SucursalesComponent).componentInstance;
  });

  it('creates and loads the branch list into the table', () => {
    expect(cmp).toBeTruthy();
    expect(cmp.dataSource.data.length).toBe(2);
  });

  it('applyFilter sets a lowercased filter term', () => {
    cmp.applyFilter('  CÓRDOBA  ');
    expect(cmp.dataSource.filter).toBe('córdoba');
  });

  it('filterPredicate matches by name and province', () => {
    const row = makeSucursalRow({ nombre: 'Sucursal Uno', provincia: 'Buenos Aires' });
    expect(cmp.dataSource.filterPredicate(row, 'uno')).toBe(true);
    expect(cmp.dataSource.filterPredicate(row, 'buenos')).toBe(true);
    expect(cmp.dataSource.filterPredicate(row, 'mendoza')).toBe(false);
  });

  it('openDetail opens the detail dialog with the row as data', () => {
    const row = makeSucursalRow({ id: 'S9' });
    cmp.openDetail(row);
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open.mock.calls[0][1].data).toBe(row);
  });

  it('clearFilter delegates to the service', () => {
    cmp.clearFilter();
    expect(data.clearFilter).toHaveBeenCalled();
  });

  it('exports without throwing', () => {
    expect(() => cmp.exportar()).not.toThrow();
  });
});
