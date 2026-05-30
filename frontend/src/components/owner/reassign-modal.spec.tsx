import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the membersStore
vi.mock('@/stores/membersStore', () => ({
  useMembersStore: vi.fn(),
}));

import { ReassignModal } from './reassign-modal';
import { useMembersStore } from '@/stores/membersStore';

const mockUseMembersStore = vi.mocked(useMembersStore);

describe('ReassignModal', () => {
  const trainers = [
    { _id: 't1', name: 'Trainer One' },
    { _id: 't2', name: 'Trainer Two' },
  ];

  const mockReassign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMembersStore.mockReturnValue(mockReassign);
  });

  it('submitting calls store.reassign with selected trainer id', async () => {
    mockReassign.mockResolvedValue(undefined);

    render(
      <ReassignModal
        memberId="m1"
        memberName="Alice"
        currentTrainerId="t1"
        trainers={trainers}
        onClose={vi.fn()}
      />,
    );

    // t2 should be pre-selected (different from current t1)
    const select = screen.getByRole('combobox');
    expect((select as HTMLSelectElement).value).toBe('t2');

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockReassign).toHaveBeenCalledWith('m1', 't2');
  });
});
