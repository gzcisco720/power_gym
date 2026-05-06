import { render } from '@testing-library/react';
import { MacroRing } from '@/components/nutrition/macro-ring';

describe('MacroRing', () => {
  it('renders 6 circles (3 tracks + 3 fills)', () => {
    const { container } = render(<MacroRing protein={50} carbs={100} fat={20} />);
    expect(container.querySelectorAll('circle')).toHaveLength(6);
  });

  it('respects custom size', () => {
    const { container } = render(<MacroRing protein={0} carbs={0} fat={0} size={200} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('200');
    expect(svg?.getAttribute('height')).toBe('200');
  });

  it('renders empty rings when totalKcal is zero', () => {
    const { container } = render(<MacroRing protein={0} carbs={0} fat={0} />);
    const fills = container.querySelectorAll('circle');
    // Every other circle starting at index 1 is a fill circle (track, fill, track, fill, ...)
    const fillCircles = Array.from(fills).filter((_, idx) => idx % 2 === 1);
    expect(fillCircles).toHaveLength(3);
    fillCircles.forEach(c => {
      expect(c.getAttribute('stroke-dasharray')).toMatch(/^0\s/);
    });
  });

  it('computes correct percentages', () => {
    // protein 50g = 200 kcal, carbs 100g = 400 kcal, fat 20g = 180 kcal → total 780
    // protein% = 200/780 ≈ 25.64
    // carbs%   = 400/780 ≈ 51.28
    // fat%     = 180/780 ≈ 23.08
    const { container } = render(<MacroRing protein={50} carbs={100} fat={20} />);
    const fills = Array.from(container.querySelectorAll('circle')).filter(
      (_, idx) => idx % 2 === 1,
    );
    const proteinDash = fills[0].getAttribute('stroke-dasharray');
    const carbsDash = fills[1].getAttribute('stroke-dasharray');
    const fatDash = fills[2].getAttribute('stroke-dasharray');
    expect(parseFloat(proteinDash!)).toBeCloseTo(25.64, 0);
    expect(parseFloat(carbsDash!)).toBeCloseTo(51.28, 0);
    expect(parseFloat(fatDash!)).toBeCloseTo(23.08, 0);
  });
});
