/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ refresh: jest.fn() })) }));

import { EquipmentClient } from '@/app/(dashboard)/owner/equipment/_components/equipment-client';

const mockItems = [
  { _id: 'e1', name: 'Smith Machine', category: 'strength' as const, quantity: 2, status: 'active' as const, purchasedAt: null, notes: null },
  { _id: 'e2', name: 'Treadmill', category: 'cardio' as const, quantity: 5, status: 'maintenance' as const, purchasedAt: null, notes: 'Needs belt replacement' },
];

describe('EquipmentClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  it('renders equipment list', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    expect(screen.getByText('Smith Machine')).toBeInTheDocument();
    expect(screen.getByText('Treadmill')).toBeInTheDocument();
  });

  it('shows empty state when no equipment', () => {
    render(<EquipmentClient initialItems={[]} />);
    expect(screen.getByText(/no equipment/i)).toBeInTheDocument();
  });

  it('shows add form when Add button clicked', () => {
    render(<EquipmentClient initialItems={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add equipment/i }));
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('calls POST API when add form submitted', async () => {
    const created = { _id: 'e3', name: 'Cable Machine', category: 'cable', quantity: 1, status: 'active', purchasedAt: null, notes: null };
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(created) });

    render(<EquipmentClient initialItems={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add equipment/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Cable Machine' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/equipment',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('calls DELETE API when delete button clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    render(<EquipmentClient initialItems={mockItems} />);
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/equipment/e1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });
});
