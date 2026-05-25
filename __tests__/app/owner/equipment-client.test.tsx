/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ refresh: jest.fn() })) }));
jest.mock('@/app/(dashboard)/owner/equipment/actions', () => ({
  getEquipmentImageSignatureAction: jest.fn(),
}));

import { EquipmentClient } from '@/app/(dashboard)/owner/equipment/_components/equipment-client';

const IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

const mockItems = [
  { _id: 'e1', name: 'Smith Machine', status: 'active' as const, brand: 'Matrix', quantity: 2, images: [IMAGE_URL], note: null, trackCondition: true, nextServiceDate: null },
  { _id: 'e2', name: 'Treadmill', status: 'maintenance' as const, brand: null, quantity: 5, images: [], note: 'Needs belt replacement', trackCondition: true, nextServiceDate: null },
  { _id: 'e3', name: 'Weight Plates', status: 'active' as const, brand: null, quantity: 50, images: [], note: null, trackCondition: false, nextServiceDate: null },
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
    expect(screen.getByText('Weight Plates')).toBeInTheDocument();
  });

  it('shows empty state when no equipment', () => {
    render(<EquipmentClient initialItems={[]} />);
    expect(screen.getByText(/no equipment/i)).toBeInTheDocument();
  });

  it('shows status badge only for items with trackCondition enabled', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    const activeBadges = screen.getAllByText('active');
    expect(activeBadges).toHaveLength(1);
  });

  it('shows Edit button for each item', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    expect(editBtns).toHaveLength(mockItems.length);
  });

  it('opens Add Equipment dialog when Add button clicked', () => {
    render(<EquipmentClient initialItems={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add equipment/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
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

  it('shows placeholder for equipment with no images', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    const placeholders = screen.getAllByLabelText('No image');
    expect(placeholders).toHaveLength(2);
  });

  it('shows thumbnail img for equipment with images', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    const thumbnailBtn = screen.getByRole('button', { name: /view smith machine image/i });
    const img = thumbnailBtn.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toContain('sample.jpg');
  });

  it('opens lightbox when thumbnail clicked', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    fireEvent.click(screen.getByRole('button', { name: /smith machine/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders status filter tabs', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^active$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^maintenance$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^retired$/i })).toBeInTheDocument();
  });

  it('filters list to maintenance items when Maintenance tab clicked', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    fireEvent.click(screen.getByRole('button', { name: /^maintenance$/i }));
    expect(screen.getByText('Treadmill')).toBeInTheDocument();
    expect(screen.queryByText('Smith Machine')).not.toBeInTheDocument();
    expect(screen.queryByText('Weight Plates')).not.toBeInTheDocument();
  });

  it('restores all items when All tab clicked after filtering', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    fireEvent.click(screen.getByRole('button', { name: /^maintenance$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(screen.getByText('Smith Machine')).toBeInTheDocument();
    expect(screen.getByText('Treadmill')).toBeInTheDocument();
    expect(screen.getByText('Weight Plates')).toBeInTheDocument();
  });

  it('shows overdue badge for equipment with a past nextServiceDate', () => {
    const overdueItems = [
      { ...mockItems[0], nextServiceDate: '2020-01-01T00:00:00.000Z' },
    ];
    render(<EquipmentClient initialItems={overdueItems} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('does not show overdue badge when nextServiceDate is in the future', () => {
    const futureItems = [
      { ...mockItems[0], nextServiceDate: '2099-01-01T00:00:00.000Z' },
    ];
    render(<EquipmentClient initialItems={futureItems} />);
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('does not show overdue badge when nextServiceDate is null', () => {
    render(<EquipmentClient initialItems={mockItems} />);
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('opens EditEquipmentDialog and fetches condition reports when Edit clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<EquipmentClient initialItems={mockItems} />);
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    fireEvent.click(editBtns[0]);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/owner/equipment/e1/condition-reports',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
  });
});
