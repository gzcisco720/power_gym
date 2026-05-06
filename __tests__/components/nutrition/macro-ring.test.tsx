import { render } from '@testing-library/react';
import { MacroRing } from '@/components/nutrition/macro-ring';

describe('MacroRing', () => {
  const fullTarget = {
    kcal: { actual: 100, target: 100 },
    protein: { actual: 50, target: 100 },
    carbs: { actual: 200, target: 100 }, // over-target
    fat: { actual: 0, target: 0 },        // no target
  };

  it('renders 8 circles (4 tracks + 4 fills)', () => {
    const { container } = render(<MacroRing values={fullTarget} />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(8);
  });

  it('respects custom size', () => {
    const { container } = render(<MacroRing values={fullTarget} size={200} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('200');
    expect(svg?.getAttribute('height')).toBe('200');
  });

  it('caps over-target at 100% filled', () => {
    const { container } = render(<MacroRing values={fullTarget} />);
    const carbsFill = container.querySelectorAll('circle')[5]; // index for carbs fill (3rd ring × 2 = 6, then +1 for fill, but ordering is per-key: track,fill,track,fill...)
    // Verify carbs fill has dasharray '100 0' (100% filled)
    // Allow small floating tolerance
    const dash = carbsFill.getAttribute('stroke-dasharray');
    expect(dash).toMatch(/^100\s/);
  });

  it('handles target=0 with 0% filled', () => {
    const { container } = render(<MacroRing values={fullTarget} />);
    const fatFill = container.querySelectorAll('circle')[7]; // last circle (fat fill)
    const dash = fatFill.getAttribute('stroke-dasharray');
    expect(dash).toMatch(/^0\s/);
  });
});
