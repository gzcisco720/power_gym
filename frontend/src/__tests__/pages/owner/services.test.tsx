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

vi.mock('@/stores/billingStore', () => ({
  useBillingStore: vi.fn(),
}));

import { useBillingStore } from '@/stores/billingStore';
import { OwnerServicesPage } from '@/pages/owner/services';

const mockCreateServiceType = vi.fn();
const mockFetchServiceTypes = vi.fn();
const mockDeleteServiceType = vi.fn();

const baseStore = {
  serviceTypes: [],
  billingLines: [],
  isLoading: false,
  error: null,
  fetchServiceTypes: mockFetchServiceTypes,
  createServiceType: mockCreateServiceType,
  deleteServiceType: mockDeleteServiceType,
  fetchMemberBilling: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <OwnerServicesPage />
    </MemoryRouter>,
  );
}

describe('OwnerServicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServiceType.mockResolvedValue(undefined);
    mockFetchServiceTypes.mockResolvedValue(undefined);
    mockDeleteServiceType.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('createServiceType called with name/duration/price as numbers', async () => {
      vi.mocked(useBillingStore).mockReturnValue(baseStore);
      const user = userEvent.setup();
      renderPage();

      // Header "Add Service" button (may also be in EmptyState)
      const addButtons = screen.getAllByRole('button', { name: /add service/i });
      await user.click(addButtons[0]);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      await user.type(screen.getByLabelText(/name/i), 'PT Session');
      const durationInput = screen.getByLabelText(/duration/i);
      await user.clear(durationInput);
      await user.type(durationInput, '60');
      await user.type(screen.getByLabelText(/price/i), '120');

      await user.click(screen.getByRole('button', { name: /^create service$/i }));

      await waitFor(() => {
        expect(mockCreateServiceType).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'PT Session',
            durationMin: 60,
            pricePerSession: 120,
          }),
        );
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
