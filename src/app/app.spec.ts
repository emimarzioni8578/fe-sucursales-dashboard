import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AppComponent } from './app';
import { AuthService } from './auth/auth.service';
import { DashboardSource } from './services/dashboard-source';
import { createMockDataService, makeSucursalRow } from './testing/mocks';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let cmp: AppComponent;
  let data: DashboardSource;
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    dialog.open.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    document.body.classList.remove('dark-theme');
    data = createMockDataService();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([{ path: 'login', children: [] }, { path: 'resumen', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DashboardSource, useValue: data },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    cmp = fixture.componentInstance;
  });

  it('creates', () => {
    expect(cmp).toBeTruthy();
  });

  it('defaults to the light theme', () => {
    expect(cmp.dark()).toBe(false);
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('toggleTheme switches the dark theme on and off and persists it', () => {
    cmp.toggleTheme();
    expect(cmp.dark()).toBe(true);
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    expect(localStorage.getItem('sucursales-theme')).toBe('dark');

    cmp.toggleTheme();
    expect(cmp.dark()).toBe(false);
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('onSearch populates results from the service', () => {
    cmp.onSearch('suc');
    expect(data.searchSucursales).toHaveBeenCalledWith('suc', 8);
    expect(cmp.searchResults().length).toBeGreaterThan(0);
  });

  it('openResult opens the detail dialog and clears results', () => {
    cmp.searchResults.set([makeSucursalRow()]);
    cmp.openResult(makeSucursalRow({ id: 'S9' }));
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(cmp.searchResults()).toEqual([]);
  });

  it('logout clears the session and navigates to /login', () => {
    const auth = TestBed.inject(AuthService);
    const logoutSpy = vi.spyOn(auth, 'logout');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    cmp.logout();
    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('isLoginPage tracks navigation to and from /login', async () => {
    const router = TestBed.inject(Router);
    expect(cmp.isLoginPage()).toBe(false);

    await router.navigateByUrl('/login?returnUrl=%2Fresumen');
    expect(cmp.isLoginPage()).toBe(true);

    await router.navigateByUrl('/resumen');
    expect(cmp.isLoginPage()).toBe(false);
  });

  it('hides the toolbar and shell chrome on /login', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-toolbar')).not.toBeNull();

    await TestBed.inject(Router).navigateByUrl('/login');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-filter-bar')).toBeNull();
  });

  it('shows the logout button only with an active session', async () => {
    fixture.detectChanges();
    const toolbarText = () => fixture.nativeElement.querySelector('mat-toolbar')!.textContent as string;
    expect(toolbarText()).not.toContain('logout');

    // Login real contra el AuthService de raíz, flusheando el POST a /auth/external.
    const pending = TestBed.inject(AuthService).loginExternal('tok', 'google');
    TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/external').flush({
      accessToken: 'a', accessTokenExpiresAtUtc: '', refreshToken: 'r', refreshTokenExpiresAtUtc: '', tokenType: 'Bearer',
    });
    await pending;

    fixture.detectChanges();
    expect(toolbarText()).toContain('logout');
  });
});
