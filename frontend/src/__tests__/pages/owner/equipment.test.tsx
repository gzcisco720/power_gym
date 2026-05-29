import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    m: {
      ...actual.m,
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      ),
    },
    LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/stores/equipmentStore', () => ({
  useEquipmentStore: vi.fn(),
}));

import { useEquipmentStore } from '@/stores/equipmentStore';
import { OwnerEquipmentPage } from '@/pages/owner/equipment';

const mockCreateEquipment = vi.fn();
const mockDeleteEquipment = vi.fn();
const mockFetchEquipment = vi.fn();

const baseStore = {
  equipment: [],
  conditionReports: {},
  isLoading: false,
  error: null,
  fetchEquipment: mockFetchEquipment,
  createEquipment: mockCreateEquipment,
  deleteEquipment: mockDeleteEquipment,
  fetchConditionReports: vi.fn(),
  addConditionReport: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <OwnerEquipmentPage />
    </MemoryRouter>,
  );
}

describe('OwnerEquipmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEquipment.mockResolvedValue(undefined);
    mockDeleteEquipment.mockResolvedValue(undefined);
    mockFetchEquipment.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('createEquipment called with name and add dialog closes', async () => {
      vi.mocked(useEquipmentStore).mockReturnValue(baseStore);
      const user = userEvent.setup();
      renderPage();

      // Header "Add Equipment" button (there may also be one in EmptyState)
      const addButtons = screen.getAllByRole('button', { name: /add equipment/i });
      await user.click(addButtons[0]);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Barbell');

      await user.click(screen.getByRole('button', { name: /^add equipment$/i }));

      await waitFor(() => {
        expect(mockCreateEquipment).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Barbell' }),
        );
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('delete', () => {
    it('confirm dialog calls deleteEquipment with id', async () => {
      vi.mocked(useEquipmentStore).mockReturnValue({
        ...baseStore,
        equipment: [{ _id: 'eq-1', name: 'Treadmill', status: 'active' }],
      });
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /delete/i }));
      const confirmDialog = screen.getByRole('dialog');
      expect(confirmDialog).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(mockDeleteEquipment).toHaveBeenCalledWith('eq-1');
      });
    });
  });
});
