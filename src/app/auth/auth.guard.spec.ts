import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  function run(loggedIn: boolean, url = '/resumen'): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isLoggedIn: () => loggedIn } },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)) as boolean | UrlTree;
  }

  it('allows navigation with an active session', () => {
    expect(run(true)).toBe(true);
  });

  it('redirects to /login preserving the target URL', () => {
    const result = run(false, '/riesgo?provincia=P1');
    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/login?returnUrl=%2Friesgo%3Fprovincia%3DP1');
  });
});
