import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddEquipmentDialog } from './add-equipment-dialog';

const mockCreate = vi.fn();

vi.mock('@/stores/equipmentStore', () => ({
  useEquipmentStore: (selector: (s: { create: typeof mockCreate }) => unknown) =>
    selector({ create: mockCreate }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AddEquipmentDialog', () => {
  it('submit calls store.create with form values', async () => {
    mockCreate.mockResolvedValue({
      _id: 'new-eq',
      name: 'Barbell',
      status: 'active',
      brand: null,
      quantity: 1,
      images: [],
      note: null,
      trackCondition: false,
      nextServiceDate: null,
    });

    const onClose = vi.fn();
    const onCreated = vi.fn();
    render(<AddEquipmentDialog open onClose={onClose} onCreated={onCreated} />);

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Barbell' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /add equipment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Barbell' }),
      );
    });
  });
});
