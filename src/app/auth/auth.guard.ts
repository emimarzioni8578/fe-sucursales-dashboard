import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Bloquea las rutas del dashboard sin sesión; guarda la URL destino para volver tras el login. */
export const authGuard: CanActivateChildFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
