import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'resumen', pathMatch: 'full' },
  { path: 'resumen', loadComponent: () => import('./pages/resumen-ejecutivo/resumen-ejecutivo').then(m => m.ResumenEjecutivoComponent) },
  { path: 'territorial', loadComponent: () => import('./pages/operacion-territorial/operacion-territorial').then(m => m.OperacionTerritorialComponent) },
  { path: 'mapa', loadComponent: () => import('./pages/mapa/mapa').then(m => m.MapaComponent) },
  { path: 'sucursales', loadComponent: () => import('./pages/sucursales/sucursales').then(m => m.SucursalesComponent) },
  { path: 'riesgo', loadComponent: () => import('./pages/riesgo-compensaciones/riesgo-compensaciones').then(m => m.RiesgoCompensacionesComponent) },
  { path: 'emails', loadComponent: () => import('./pages/emails-verificacion/emails-verificacion').then(m => m.EmailsVerificacionComponent) },
  { path: 'auditoria', loadComponent: () => import('./pages/auditoria-cambios/auditoria-cambios').then(m => m.AuditoriaCambiosComponent) },
  { path: 'calidad', loadComponent: () => import('./pages/calidad-datos/calidad-datos').then(m => m.CalidadDatosComponent) },
];
