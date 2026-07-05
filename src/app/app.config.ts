import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { DashboardSource } from './services/dashboard-source';
import { CsvDashboardService } from './services/csv-dashboard.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    // Bearer + refresh con rotación para los requests a la API (ver auth/auth.interceptor.ts).
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    // Fuente de datos del dashboard. Para migrar al backend, reemplazar por
    // `useClass: ApiDashboardService` (ver services/api-dashboard.service.ts).
    { provide: DashboardSource, useClass: CsvDashboardService },
  ],
};
