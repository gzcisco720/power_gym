import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatStripSection } from './stat-strip-section';
import type { StatStrip } from '@/api/member-hub';

const mockStatStrip: StatStrip = {
  weight: 82.5,
  bodyFatPct: 16.2,
  sessionsLast90: 14,
  lastSessionLabel: '3d ago',
  lastDayName: 'Pull Day',
  weightDelta: { text: '▼ 1.5 kg', variant: 'success' },
  bfDelta: { text: '▼ 0.8%', variant: 'success' },
};

describe('StatStripSection', () => {
  it('renders seeded stat values', () => {
    render(<StatStripSection statStrip={mockStatStrip} />);

    expect(screen.getByText('82.5')).toBeInTheDocument();
    expect(screen.getByText('16.2')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('3d ago')).toBeInTheDocument();
  });

  it('renders dash for weight when no data', () => {
    render(<StatStripSection statStrip={{ ...mockStatStrip, weight: null, bodyFatPct: null }} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
