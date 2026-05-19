import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { InjuryClient } from '@/app/(dashboard)/trainer/members/[id]/health/_components/injury-client';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockInjury = {
  _id: 'inj1',
  title: 'Left knee strain',
  affectedMovements: 'Avoid squats',
  trainerNotes: 'Ice daily',
  memberNotes: null,
  status: 'active' as const,
  recordedAt: '2024-01-01T00:00:00.000Z',
  resolvedAt: null,
  injuryType: null,
  bodyPart: null,
  bodySide: null,
  painAtRest: null,
  painDuringExercise: null,
  mechanism: null,
  aggravatingFactors: null,
  relievingFactors: null,
  doctorRestrictions: null,
  rehabilitationStatus: null,
};

describe('InjuryClient loading states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables the status-change button while request is in flight', async () => {
    let resolveStatus: (v: unknown) => void;
    const pending = new Promise((res) => { resolveStatus = res; });
    global.fetch = jest.fn().mockReturnValue(
      pending.then(() => ({ ok: true, json: async () => ({ ...mockInjury, status: 'resolved' }) })),
    );

    render(<InjuryClient memberId="m1" initialInjuries={[mockInjury]} role="trainer" />);

    const resolveBtn = screen.getByRole('button', { name: /mark resolved/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => expect(resolveBtn).toBeDisabled());

    await act(async () => { resolveStatus!(undefined); });
  });

  it('disables the delete confirm button while request is in flight', async () => {
    let resolveDelete: (v: unknown) => void;
    const pending = new Promise((res) => { resolveDelete = res; });
    global.fetch = jest.fn().mockReturnValue(
      pending.then(() => ({ ok: true, json: async () => ({}) })),
    );

    render(<InjuryClient memberId="m1" initialInjuries={[mockInjury]} role="trainer" />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    const confirmBtn = await screen.findByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(confirmBtn).toBeDisabled());

    await act(async () => { resolveDelete!(undefined); });
  });

  it('disables the save-notes button while request is in flight', async () => {
    let resolveNotes: (v: unknown) => void;
    const pending = new Promise((res) => { resolveNotes = res; });
    global.fetch = jest.fn().mockReturnValue(
      pending.then(() => ({ ok: true, json: async () => ({ ...mockInjury, memberNotes: 'aching' }) })),
    );

    render(<InjuryClient memberId="m1" initialInjuries={[mockInjury]} role="member" />);

    fireEvent.click(screen.getByRole('button', { name: /add my notes/i }));
    const saveBtn = screen.getByRole('button', { name: /^save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(saveBtn).toBeDisabled());

    await act(async () => { resolveNotes!(undefined); });
  });
});
