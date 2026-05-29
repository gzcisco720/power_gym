import { render, screen } from '@testing-library/react';
import { EquipmentStatusPanel } from '@/components/owner/equipment-status-panel';
import type { Equipment } from '@/api/equipment';

const makeEquipment = (overrides: Partial<Equipment> = {}): Equipment => ({
  _id: 'eq1',
  name: 'Barbell',
  status: 'active',
  brand: null,
  quantity: 1,
  note: null,
  trackCondition: false,
  ...overrides,
});

describe('EquipmentStatusPanel', () => {
  describe('empty', () => {
    it('renders "No equipment tracked" when array is empty', () => {
      render(<EquipmentStatusPanel equipment={[]} />);
      expect(screen.getByText('No equipment tracked')).toBeInTheDocument();
    });
  });

  describe('renders counts', () => {
    it('shows Active/Maintenance/Retired counts matching the equipment array', () => {
      const equipment: Equipment[] = [
        makeEquipment({ _id: 'e1', name: 'Barbell', status: 'active' }),
        makeEquipment({ _id: 'e2', name: 'Kettlebell', status: 'active' }),
        makeEquipment({ _id: 'e3', name: 'Treadmill', status: 'maintenance' }),
        makeEquipment({ _id: 'e4', name: 'Rowing Machine', status: 'retired' }),
      ];
      render(<EquipmentStatusPanel equipment={equipment} />);

      // Count badges: 2 active, 1 maintenance, 1 retired
      expect(screen.getByTestId('count-active')).toHaveTextContent('2');
      expect(screen.getByTestId('count-maintenance')).toHaveTextContent('1');
      expect(screen.getByTestId('count-retired')).toHaveTextContent('1');
    });
  });

  describe('item badge', () => {
    it('applies emerald tone for active, amber for maintenance, muted for retired', () => {
      const equipment: Equipment[] = [
        makeEquipment({ _id: 'e1', name: 'Barbell', status: 'active' }),
        makeEquipment({ _id: 'e2', name: 'Treadmill', status: 'maintenance' }),
        makeEquipment({ _id: 'e3', name: 'Old Bike', status: 'retired' }),
      ];
      render(<EquipmentStatusPanel equipment={equipment} />);

      const badges = screen.getAllByTestId('item-status-badge');
      expect(badges).toHaveLength(3);

      // Active badge uses emerald
      expect(badges[0]).toHaveClass('text-emerald-300');
      // Maintenance badge uses amber
      expect(badges[1]).toHaveClass('text-amber-300');
      // Retired badge uses muted foreground
      expect(badges[2]).toHaveClass('text-foreground/40');
    });
  });
});
