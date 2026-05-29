import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MemberHealthPanel } from '@/components/trainer/member-health-panel';
import type { Injury } from '@/api/member-health';

function makeInjury(overrides: Partial<Injury> = {}): Injury {
  return {
    _id: 'inj-1',
    memberId: 'member-1',
    title: 'Left knee sprain',
    status: 'active',
    recordedAt: new Date('2026-05-01').toISOString(),
    bodyPart: 'Knee',
    trainerNotes: 'Avoid squats',
    resolvedAt: null,
    ...overrides,
  };
}

function renderPanel(props: Parameters<typeof MemberHealthPanel>[0]) {
  return render(
    <MemoryRouter>
      <MemberHealthPanel {...props} />
    </MemoryRouter>,
  );
}

describe('MemberHealthPanel', () => {
  describe('active injury', () => {
    it('renders the active injury title', () => {
      const injuries = [makeInjury()];
      renderPanel({ memberId: 'member-1', injuries });

      expect(screen.getByText('Left knee sprain')).toBeInTheDocument();
    });
  });

  describe('no injury', () => {
    it('renders "No active injuries" when injuries list is empty', () => {
      renderPanel({ memberId: 'member-1', injuries: [] });

      expect(screen.getByText(/no active injuries/i)).toBeInTheDocument();
    });
  });
});
