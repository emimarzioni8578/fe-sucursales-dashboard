import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProvinciaDetailDialog, ProvinciaDetailData } from './provincia-detail';
import { makeProvinciaData } from '@testing/mocks';
import { provinciaBenchmark } from '@services/aggregations';

const net = { pctActivas: 60, pctCobDist: 40, pctCobSocial: 20, pctMailsFallidos: 50 };

function setup(data: ProvinciaDetailData) {
  TestBed.configureTestingModule({
    imports: [ProvinciaDetailDialog],
    providers: [
      provideNoopAnimations(),
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: () => {} } },
    ],
  });
  return TestBed.createComponent(ProvinciaDetailDialog);
}

describe('ProvinciaDetailDialog', () => {
  it('renders the province name and benchmark rows', () => {
    const p = makeProvinciaData({ nombre: 'Cordoba' });
    const fixture = setup({ provincia: p, benchmark: provinciaBenchmark(p, net) });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Cordoba');
    expect(text).toContain('% Activas');
  });

  it('isGood reflects the direction of the metric', () => {
    const p = makeProvinciaData();
    const cmp = setup({ provincia: p, benchmark: provinciaBenchmark(p, net) }).componentInstance;
    expect(cmp.isGood({ label: 'x', value: 1, network: 0, delta: 5, higherIsBetter: true })).toBe(true);
    expect(cmp.isGood({ label: 'x', value: 1, network: 0, delta: 5, higherIsBetter: false })).toBe(false);
    expect(cmp.isGood({ label: 'x', value: 1, network: 0, delta: 0, higherIsBetter: false })).toBe(true);
  });
});
