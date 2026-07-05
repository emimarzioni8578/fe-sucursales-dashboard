import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

/**
 * Decora los requests a la API con el Bearer + headers de auditoría, y ante un 401 en
 * un endpoint protegido hace UN intento de refresh y reintenta el request. Los requests
 * que no van a la API (p. ej. los CSVs de assets/) pasan sin tocar.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);

  const decorate = (r: HttpRequest<unknown>) => {
    // X-* son opcionales para la API, pero alimentan su auditoría/correlación.
    let headers = r.headers
      .set('X-Application', 'sucursales-dashboard')
      .set('X-Channel', 'web')
      .set('X-Correlation-ID', crypto.randomUUID());
    const token = auth.accessToken();
    if (token && !r.url.includes('/auth/')) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return r.clone({ headers });
  };

  return next(decorate(req)).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 en endpoint protegido → un único intento de refresh y reintento del request.
      if (err.status !== 401 || req.url.includes('/auth/')) return throwError(() => err);
      return from(auth.refresh()).pipe(
        switchMap(ok => {
          if (ok) return next(decorate(req));
          // Refresh vencido/revocado: la sesión ya se limpió, volver al login.
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => err);
        }));
    }));
};
