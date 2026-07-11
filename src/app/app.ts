import { Component, computed, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@auth/auth.service';
import { DashboardSource } from '@services/dashboard-source';
import { FilterUrlSyncService } from '@services/filter-url-sync';
import { FilterBarComponent } from '@components/filter-bar/filter-bar';
import { SucursalDetailDialog } from '@components/sucursal-detail/sucursal-detail';
import type { SucursalRow } from '@models/data-models.model';

const THEME_KEY = 'sucursales-theme';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AsyncPipe, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatAutocompleteModule, FilterBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private filterUrlSync = inject(FilterUrlSyncService);
  auth = inject(AuthService);
  data = inject(DashboardSource);
  state$ = this.data.state$;
  dark = signal(false);
  searchResults = signal<SucursalRow[]>([]);

  // En /login el shell (toolbar, filtros, estado de datos) no aplica: se muestra solo la página.
  private readonly url = toSignal(this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map(e => e.urlAfterRedirects)), { initialValue: this.router.url });
  readonly isLoginPage = computed(() => this.url().startsWith('/login'));

  onSearch(term: string): void {
    this.searchResults.set(this.data.searchSucursales(term, 8));
  }

  openResult(row: SucursalRow): void {
    this.dialog.open(SucursalDetailDialog, { data: row, width: '520px', maxWidth: '95vw' });
    this.searchResults.set([]);
  }

  constructor() {
    const saved = localStorage.getItem(THEME_KEY);
    this.setDark(saved === 'dark');
    this.filterUrlSync.start();
  }

  reload(): void { this.data.reload(); }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  toggleTheme(): void { this.setDark(!this.dark()); }

  private setDark(on: boolean): void {
    this.dark.set(on);
    const scheme = on ? 'dark' : 'light';
    document.documentElement.style.colorScheme = scheme;
    document.body.style.colorScheme = scheme;
    document.body.classList.toggle('dark-theme', on);
    localStorage.setItem(THEME_KEY, scheme);
  }

  isActive(path: string): boolean {
    return this.router.url.includes(path);
  }

  navItems = [
    { path: 'resumen', icon: 'dashboard', label: 'Resumen' },
    { path: 'territorial', icon: 'map', label: 'Territorial' },
    { path: 'mapa', icon: 'public', label: 'Mapa' },
    { path: 'sucursales', icon: 'store', label: 'Sucursales' },
    { path: 'calificaciones', icon: 'star', label: 'Calificaciones' },
    { path: 'riesgo', icon: 'warning', label: 'Riesgo' },
    { path: 'emails', icon: 'email', label: 'Emails' },
    { path: 'auditoria', icon: 'history', label: 'Auditoría' },
    { path: 'calidad', icon: 'fact_check', label: 'Calidad' },
  ];
}
