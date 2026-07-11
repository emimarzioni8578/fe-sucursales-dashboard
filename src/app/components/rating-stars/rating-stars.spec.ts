import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RatingStarsComponent } from './rating-stars';

@Component({
  standalone: true,
  imports: [RatingStarsComponent],
  template: `<app-rating-stars [average]="average" [count]="count" />`,
})
class HostComponent {
  average: number | null = 3.8;
  count = 21;
}

describe('RatingStarsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('renders average, stars and vote count', () => {
    fixture.detectChanges();
    expect(text()).toContain('3.8');
    expect(text()).toContain('(21)');
    expect(text()).toContain('★★★★★');
  });

  it('fills the amber layer proportionally to the average', () => {
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('76%'); // 3.8/5
  });

  it('exposes an accessible label with average and votes (identity is not color-alone)', () => {
    fixture.detectChanges();
    const rating = fixture.nativeElement.querySelector('.rating') as HTMLElement;
    expect(rating.getAttribute('aria-label')).toBe('3.8 de 5 estrellas (21 votos)');
  });

  it('shows "Sin calificaciones" for null average — never 0 stars', () => {
    host.average = null;
    host.count = 0;
    fixture.detectChanges();
    expect(text()).toContain('Sin calificaciones');
    expect(text()).not.toContain('★');
  });

  it('clamps out-of-range averages to the 0–100% fill band', () => {
    host.average = 9;
    fixture.detectChanges();
    const fill = fixture.nativeElement.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
