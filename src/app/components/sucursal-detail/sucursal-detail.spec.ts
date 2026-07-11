import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SucursalDetailDialog } from './sucursal-detail';
import { makeSucursalRow } from '@testing/mocks';

describe('SucursalDetailDialog', () => {
  let fixture: ComponentFixture<SucursalDetailDialog>;

  async function setup(rowOverrides = {}) {
    await TestBed.configureTestingModule({
      imports: [SucursalDetailDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: makeSucursalRow(rowOverrides) },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SucursalDetailDialog);
    fixture.detectChanges();
  }

  it('renders the branch name and contact info', async () => {
    await setup({ nombre: 'Sucursal Test', email: 'test@e.com' });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sucursal Test');
    expect(text).toContain('test@e.com');
  });

  it('shows quality badges for branches with issues', async () => {
    await setup({ sinCoord: true, tieneDist: false, tieneSocial: false });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sin coordenadas');
    expect(text).toContain('Sin distribuidor');
    expect(text).toContain('Sin red social');
  });

  it('renders the metric values', async () => {
    await setup({ compAbiertas: 7, mailsFallidos: 3, riesgo: 17 });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('7');
    expect(text).toContain('17');
  });

  it('shows the Google-style rating with average and vote count', async () => {
    await setup({ ratingAverage: 3.8, ratingCount: 21 });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('3.8');
    expect(text).toContain('(21)');
    expect(text).toContain('★★★★★');
  });

  it('shows "Sin calificaciones" when the branch has no votes', async () => {
    await setup({ ratingAverage: null, ratingCount: 0 });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sin calificaciones');
  });
});
