import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import { DashboardSource } from '@services/dashboard-source';
import type { SucursalGeo } from '@models/data-models.model';
import { ESTADO_COLOR, ESTADO_COLOR_FALLBACK } from '@shared/chart-theme';

type Metric = 'densidad' | 'riesgo' | 'mails';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [MatCardModule, MatButtonToggleModule, MatSlideToggleModule, MatIconModule],
  templateUrl: './mapa.html',
  styleUrl: './mapa.scss',
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  private data = inject(DashboardSource);
  private dashboard = toSignal(this.data.data$);
  private map?: L.Map;
  private heatLayer?: L.Layer;
  private clusterLayer?: L.Layer;
  private fitted = false;

  metric = signal<Metric>('riesgo');
  showMarkers = signal(true);
  stats = computed(() => {
    const d = this.dashboard();
    return d
      ? { total: d.totalSucursales, plotted: d.sucursalesGeo.length, invalid: d.coordsInvalidas }
      : { total: 0, plotted: 0, invalid: 0 };
  });

  constructor() {
    // Una sola fuente reactiva: redibuja ante cambios de datos, métrica o toggle de marcadores.
    effect(() => this.render());
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, { center: [-38.4, -63.6], zoom: 4, preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18,
    }).addTo(this.map);
    this.render(); // primer dibujo cuando los datos ya estaban disponibles
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  setMetric(m: Metric): void { this.metric.set(m); }
  toggleMarkers(checked: boolean): void { this.showMarkers.set(checked); }

  private render(): void {
    // Lee las tres señales siempre (aunque el mapa aún no exista) para registrarlas como dependencias.
    const metric = this.metric();
    const showMarkers = this.showMarkers();
    const d = this.dashboard();
    const map = this.map;
    if (!map || !d) return;
    this.draw(map, d.sucursalesGeo.filter(g => g.coordValida), metric, showMarkers);
  }

  private draw(map: L.Map, valid: SucursalGeo[], metric: Metric, showMarkers: boolean): void {
    if (this.heatLayer) { map.removeLayer(this.heatLayer); this.heatLayer = undefined; }
    if (this.clusterLayer) { map.removeLayer(this.clusterLayer); this.clusterLayer = undefined; }
    if (!valid.length) return;

    // --- Heatmap ---
    const maxRiesgo = Math.max(1, ...valid.map(g => g.riesgo));
    const maxMails = Math.max(1, ...valid.map(g => g.mailsFallidos));
    const points: [number, number, number][] = valid.map(g => {
      let w = 0.45;
      if (metric === 'riesgo') w = g.riesgo / maxRiesgo;
      else if (metric === 'mails') w = g.mailsFallidos / maxMails;
      return [g.lat, g.lng, Math.max(0.12, w)];
    });
    this.heatLayer = (L as any).heatLayer(points, { radius: 24, blur: 18, maxZoom: 11 }).addTo(map);

    // --- Marcadores con clustering ---
    if (showMarkers) {
      const cluster = (L as any).markerClusterGroup({ chunkedLoading: true });
      valid.forEach(g => {
        const color = ESTADO_COLOR[g.estado] || ESTADO_COLOR_FALLBACK;
        const marker = L.circleMarker([g.lat, g.lng], {
          radius: 5, color, fillColor: color, fillOpacity: 0.85, weight: 1,
        });
        marker.bindPopup(
          `<b>${g.nombre}</b><br>${g.provincia} &middot; ${g.region}<br>` +
          `Estado: <b>${g.estado}</b><br>Comp. abiertas: ${g.compAbiertas}<br>` +
          `Mails fallidos: ${g.mailsFallidos}<br>Score riesgo: ${g.riesgo}`,
        );
        cluster.addLayer(marker);
      });
      this.clusterLayer = cluster;
      map.addLayer(cluster);
    }

    if (!this.fitted) {
      map.fitBounds(L.latLngBounds(valid.map(g => [g.lat, g.lng] as [number, number])), { padding: [30, 30] });
      this.fitted = true;
    }
  }
}
