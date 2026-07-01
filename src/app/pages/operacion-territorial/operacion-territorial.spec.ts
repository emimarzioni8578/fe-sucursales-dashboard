import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { OperacionTerritorialComponent } from './operacion-territorial';
import { DashboardSource } from '@services/dashboard-source';
import { createMockDataService, makeProvinciaData, makeDashboardData } from '@testing/mocks';

describe('OperacionTerritorialComponent', () => {
  let cmp: OperacionTerritorialComponent;
  let data: DashboardSource;
  let router: Router;
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    dialog.open.mockReset();
    dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
    data = createMockDataService(makeDashboardData());
    await TestBed.configureTestingModule({
      imports: [OperacionTerritorialComponent],
      providers: [
        provideNoopAnimations(), provideRouter([]),
        { provide: DashboardSource, useValue: data },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    cmp = TestBed.createComponent(OperacionTerritorialComponent).componentInstance;
  });

  it('creates and loads provincia rows into the table', () => {
    expect(cmp).toBeTruthy();
    expect(cmp.dataSource.data.length).toBe(2);
  });

  it('drill-down filters by the provincia id and navigates to /sucursales', () => {
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    cmp.verSucursales(makeProvinciaData({ provinciaId: 'P2', nombre: 'Cordoba' }));
    expect(data.setFilter).toHaveBeenCalledWith({ provincia: 'P2', region: null, estado: null });
    expect(navSpy).toHaveBeenCalledWith(['/sucursales'], { queryParams: { provincia: 'P2' } });
  });

  it('openProvincia opens the detail dialog with the province and its benchmark', () => {
    const p = makeProvinciaData({ provinciaId: 'P2', nombre: 'Cordoba' });
    cmp.openProvincia(p);
    expect(dialog.open).toHaveBeenCalledTimes(1);
    const config = dialog.open.mock.calls[0][1];
    expect(config.data.provincia).toBe(p);
    expect(config.data.benchmark.length).toBe(4);
  });

  it('choosing "ver sucursales" in the dialog drills down by province', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of('ver-sucursales') });
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    cmp.openProvincia(makeProvinciaData({ provinciaId: 'P2', nombre: 'Cordoba' }));
    expect(data.setFilter).toHaveBeenCalledWith({ provincia: 'P2', region: null, estado: null });
    expect(navSpy).toHaveBeenCalledWith(['/sucursales'], { queryParams: { provincia: 'P2' } });
  });

  it('exports the current rows without throwing', () => {
    expect(() => cmp.exportar()).not.toThrow();
  });
});
