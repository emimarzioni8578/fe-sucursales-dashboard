import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

// --- Mock Leaflet (and its plugins) so the page renders in jsdom without a real map/canvas. ---
const { popups, heatCalls } = vi.hoisted(() => ({
  popups: [] as string[],
  heatCalls: [] as [number, number, number][][],
}));
vi.mock('leaflet.heat', () => ({}));
vi.mock('leaflet.markercluster', () => ({}));
vi.mock('leaflet', () => {
  const layer = (): any => {
    const o: any = { addTo: () => o, bindPopup: (html: string) => { popups.push(html); return o; }, addLayer: () => {} };
    return o;
  };
  return {
    map: () => ({ addLayer: () => {}, removeLayer: () => {}, remove: () => {}, fitBounds: () => {} }),
    tileLayer: () => layer(),
    circleMarker: () => layer(),
    heatLayer: (points: [number, number, number][]) => { heatCalls.push(points); return layer(); },
    markerClusterGroup: () => layer(),
    latLngBounds: () => ({}),
  };
});

import { MapaComponent } from './mapa';
import { DashboardSource } from '@services/dashboard-source';
import { createMockDataService, makeDashboardData } from '@testing/mocks';
import type { SucursalGeo } from '@models/data-models.model';

const geo: SucursalGeo[] = [
  { id: 'S1', nombre: 'Uno', lat: -34.6, lng: -58.4, estado: 'Activa', provincia: 'BA', region: 'Pampeana', compAbiertas: 1, mailsFallidos: 0, riesgo: 2, coordValida: true, ratingAverage: 4.3, ratingCount: 27 },
  { id: 'S2', nombre: 'Dos', lat: 10, lng: 10, estado: 'Inactiva', provincia: 'BA', region: 'Pampeana', compAbiertas: 0, mailsFallidos: 1, riesgo: 1, coordValida: false, ratingAverage: null, ratingCount: 0 },
  { id: 'S3', nombre: 'Tres', lat: -31.4, lng: -64.2, estado: 'Activa', provincia: 'CBA', region: 'Centro', compAbiertas: 0, mailsFallidos: 0, riesgo: 0, coordValida: true, ratingAverage: null, ratingCount: 0 },
];

describe('MapaComponent', () => {
  let fixture: ComponentFixture<MapaComponent>;
  let cmp: MapaComponent;

  beforeEach(async () => {
    popups.length = 0;
    heatCalls.length = 0;
    const data = createMockDataService(makeDashboardData({
      sucursalesGeo: geo, coordsInvalidas: 1, totalSucursales: 3,
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
    expect(cmp.stats().total).toBe(3);
    expect(cmp.stats().plotted).toBe(3);
    expect(cmp.stats().invalid).toBe(1);
  });

  it('setMetric switches the active heatmap metric', () => {
    expect(cmp.metric()).toBe('riesgo');
    cmp.setMetric('densidad');
    expect(cmp.metric()).toBe('densidad');
    cmp.setMetric('mails');
    expect(cmp.metric()).toBe('mails');
    cmp.setMetric('rating');
    expect(cmp.metric()).toBe('rating');
  });

  it('offers the rating metric in the heatmap toggle', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Calificación');
  });

  it('toggleMarkers flips the marker visibility flag without throwing', () => {
    expect(cmp.showMarkers()).toBe(true);
    expect(() => cmp.toggleMarkers(false)).not.toThrow();
    expect(cmp.showMarkers()).toBe(false);
  });

  it('binds popups with the Google-style rating (stars for rated, fallback for unrated)', () => {
    const s1 = popups.find(p => p.includes('Uno'))!;
    expect(s1).toContain('4.3');
    expect(s1).toContain('★★★★★');
    expect(s1).toContain('(27)');
    expect(s1).toContain('width:86%'); // 4.3/5 de relleno ámbar

    // S3 (válida, sin votos) muestra el fallback; S2 ni aparece (coordenada inválida)
    expect(popups.find(p => p.includes('Tres'))).toContain('Sin calificaciones');
    expect(popups.some(p => p.includes('Dos'))).toBe(false);
  });

  describe('heatmap weights per metric (only valid coordinates)', () => {
    /** Último dibujo del heatmap: [lat, lng, peso] por sucursal ploteada. */
    const lastWeights = (): number[] => heatCalls.at(-1)!.map(p => p[2]);

    it('riesgo (default): normalizes against the max and floors zero-risk points', () => {
      // S1 riesgo 2 / max 2 = 1 · S3 riesgo 0 → piso 0.12
      expect(lastWeights()).toEqual([1, 0.12]);
    });

    it('rating: worse rating heats more; unrated points carry no signal (floor)', () => {
      cmp.setMetric('rating');
      fixture.detectChanges();
      // S1: (5 - 4.3) / 4 = 0.175 · S3 sin votos → piso 0.12
      const [s1, s3] = lastWeights();
      expect(s1).toBeCloseTo(0.175, 10);
      expect(s3).toBe(0.12);
    });

    it('densidad: uniform weight for every point', () => {
      cmp.setMetric('densidad');
      fixture.detectChanges();
      expect(lastWeights()).toEqual([0.45, 0.45]);
    });

    it('mails: normalizes failed mails against the max', () => {
      cmp.setMetric('mails');
      fixture.detectChanges();
      // maxMails = max(1, 0, 0) = 1 → S1 0/1 = 0 → piso; S3 0 → piso
      expect(lastWeights()).toEqual([0.12, 0.12]);
    });
  });
});
