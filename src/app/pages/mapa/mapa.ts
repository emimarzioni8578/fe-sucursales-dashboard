import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet.heat';
import 'leaflet.markercluster';
import { DataService } from '../../services/data';
import type { SucursalGeo } from '../../models/data-models.model';

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
  private data = inject(DataService);
  private sub?: Subscription;
  private map?: L.Map;
  private heatLayer?: L.Layer;
  private clusterLayer?: L.Layer;
  private fitted = false;
  private geo: SucursalGeo[] = [];

  metric = signal<Metric>('riesgo');
  showMarkers = signal(true);
  stats = signal({ total: 0, plotted: 0, invalid: 0 });

  private estadoColor: Record<string, string> = {
    Activa: '#66bb6a', Inactiva: '#ef5350', Pendiente: '#ffa726',
  };

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, { center: [-38.4, -63.6], zoom: 4, preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18,
    }).addTo(this.map);

    this.sub = this.data.data$.subscribe(d => {
      this.geo = d.sucursalesGeo;
      this.stats.set({ total: d.totalSucursales, plotted: d.sucursalesGeo.length, invalid: d.coordsInvalidas });
      this.draw();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.map?.remove();
  }

  setMetric(m: Metric): void { this.metric.set(m); this.draw(); }
  toggleMarkers(checked: boolean): void { this.showMarkers.set(checked); this.draw(); }

  private draw(): void {
    const map = this.map;
    if (!map) return;

    if (this.heatLayer) { map.removeLayer(this.heatLayer); this.heatLayer = undefined; }
    if (this.clusterLayer) { map.removeLayer(this.clusterLayer); this.clusterLayer = undefined; }

    const valid = this.geo.filter(g => g.coordValida);
    if (!valid.length) return;

    // --- Heatmap ---
    const m = this.metric();
    const maxRiesgo = Math.max(1, ...valid.map(g => g.riesgo));
    const maxMails = Math.max(1, ...valid.map(g => g.mailsFallidos));
    const points: [number, number, number][] = valid.map(g => {
      let w = 0.45;
      if (m === 'riesgo') w = g.riesgo / maxRiesgo;
      else if (m === 'mails') w = g.mailsFallidos / maxMails;
      return [g.lat, g.lng, Math.max(0.12, w)];
    });
    this.heatLayer = (L as any).heatLayer(points, { radius: 24, blur: 18, maxZoom: 11 }).addTo(map);

    // --- Marcadores con clustering ---
    if (this.showMarkers()) {
      const cluster = (L as any).markerClusterGroup({ chunkedLoading: true });
      valid.forEach(g => {
        const color = this.estadoColor[g.estado] || '#90a4ae';
        const marker = L.circleMarker([g.lat, g.lng], {
          radius: 5, color, fillColor: color, fillOpacity: 0.85, weight: 1,
        });
        marker.bindPopup(
          `<b>${g.nombre}</b><br>${g.provincia} &middot; ${g.region}<br>` +
          `Estado: <b>${g.estado}</b><br>Comp. abiertas: ${g.compAbiertas}<br>` +
          `Mails fallidos: ${g.mailsFallidos}<br>Score riesgo: ${g.riesgo}`
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
