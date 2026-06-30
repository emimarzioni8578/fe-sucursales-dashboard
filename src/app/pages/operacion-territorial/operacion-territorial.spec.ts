import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { OperacionTerritorialComponent } from './operacion-territorial';
import { DataService } from '../../services/data';
import { createMockDataService, makeProvinciaData, makeDashboardData } from '../../testing/mocks';

describe('OperacionTerritorialComponent', () => {
  let cmp: OperacionTerritorialComponent;
  let data: DataService;
  let router: Router;

  beforeEach(async () => {
    data = createMockDataService(makeDashboardData());
    await TestBed.configureTestingModule({
      imports: [OperacionTerritorialComponent],
      providers: [provideNoopAnimations(), provideRouter([]), { provide: DataService, useValue: data }],
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
    expect(navSpy).toHaveBeenCalledWith(['/sucursales']);
  });

  it('exports the current rows without throwing', () => {
    expect(() => cmp.exportar()).not.toThrow();
  });
});
