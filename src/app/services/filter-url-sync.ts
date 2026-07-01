import { Injectable, DestroyRef, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardSource } from './dashboard-source';
import { EMPTY_FILTER } from './aggregations';
import { filterToParams, paramsToFilter, filterKey } from './filter-url';

/**
 * Mantiene sincronizado el filtro global con la query string de la URL, en ambos
 * sentidos, sin acoplar la UI a la implementación concreta de `DashboardSource`:
 *
 *  - URL → filtro: al cargar (deep-link compartido/bookmark) y en back/forward del navegador.
 *  - filtro → URL: cada cambio del filtro reescribe los query params (con `replaceUrl`,
 *    para no inundar el historial en cada tecla).
 *
 * `lastKey` deduplica ambos flujos: cuando un lado ya aplicó un valor, el eco del
 * otro lado se descarta, evitando un loop de actualizaciones.
 */
@Injectable({ providedIn: 'root' })
export class FilterUrlSyncService {
  private data = inject(DashboardSource);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  private lastKey = filterKey(EMPTY_FILTER);
  private started = false;

  /** Idempotente: se invoca una vez desde el shell (`AppComponent`). */
  start(): void {
    if (this.started) return;
    this.started = true;

    // URL → filtro (carga inicial + navegación con back/forward).
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const f = paramsToFilter(params);
      const key = filterKey(f);
      if (key === this.lastKey) return;
      this.lastKey = key;
      this.data.setFilter(f);
    });

    // Filtro → URL.
    this.data.activeFilter$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(f => {
      const key = filterKey(f);
      if (key === this.lastKey) return;
      this.lastKey = key;
      this.router.navigate([], { queryParams: filterToParams(f), replaceUrl: true });
    });
  }
}
