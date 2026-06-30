import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

// --- Mock Leaflet (and its plugins) so the page renders in jsdom without a real map/canvas. ---
vi.mock('leaflet.heat', () => ({}));
vi.mock('leaflet.markercluster', () => ({}));
vi.mock('leaflet', () => {
  const layer = (): any => {
    const o: any = { addTo: () => o, bindPopup: () => o, addLayer: () => {} };
    return o;
  };
  return {
    map: () => ({ addLayer: () => {}, removeLayer: () => {}, remove: () => {}, fitBounds: () => {} }),
    tileLayer: () => layer(),
    circleMarker: () => layer(),
    heatLayer: () => layer(),
    markerClusterGroup: () => layer(),
    latLngBounds: () => ({}),
  };
});

import { MapaComponent } from './mapa';
import { DashboardSource } from '@services/dashboard-source';
import { createMockDataService, makeDashboardData } from '@testing/mocks';
import type { SucursalGeo } from '@models/data-models.model';

const geo: SucursalGeo[] = [
  { id: 'S1', nombre: 'Uno', lat: -34.6, lng: -58.4, estado: 'Activa', provincia: 'BA', region: 'Pampeana', compAbiertas: 1, mailsFallidos: 0, riesgo: 2, coordValida: true },
  { id: 'S2', nombre: 'Dos', lat: 10, lng: 10, estado: 'Inactiva', provincia: 'BA', region: 'Pampeana', compAbiertas: 0, mailsFallidos: 1, riesgo: 1, coordValida: false },
];

describe('MapaComponent', () => {
  let fixture: ComponentFixture<MapaComponent>;
  let cmp: MapaComponent;

  beforeEach(async () => {
    const data = createMockDataService(makeDashboardData({
      sucursalesGeo: geo, coordsInvalidas: 1, totalSucursales: 2,
    }));
    await TestBed.configureTestingModule({
      imports: [MapaComponent],
      providers: [provideNoopAnimations(), { provide: DashboardSource, useValue: data }],
    }).compileComponents();
    fixture = TestBed.createComponent(MapaComponent);
    cmp = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngAfterViewInit -> map init + data subscription + draw()
  });

  it('creates and initializes the map without a real Leaflet instance', () => {
    expect(cmp).toBeTruthy();
  });

  it('renders the heatmap controls and legend', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Mapa de Sucursales');
    expect(text).toContain('Densidad');
    expect(text).toContain('Riesgo');
    expect(text).toContain('Mails fallidos');
  });

  it('populates the stats from the geo data', () => {
    expect(cmp.stats().total).toBe(2);
    expect(cmp.stats().plotted).toBe(2);
    expect(cmp.stats().invalid).toBe(1);
  });

  it('setMetric switches the active heatmap metric', () => {
    expect(cmp.metric()).toBe('riesgo');
    cmp.setMetric('densidad');
    expect(cmp.metric()).toBe('densidad');
    cmp.setMetric('mails');
    expect(cmp.metric()).toBe('mails');
  });

  it('toggleMarkers flips the marker visibility flag without throwing', () => {
    expect(cmp.showMarkers()).toBe(true);
    expect(() => cmp.toggleMarkers(false)).not.toThrow();
    expect(cmp.showMarkers()).toBe(false);
  });
});
