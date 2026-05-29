import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
    useReducedMotion: () => false,
  };
});

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@/stores/bodyTestsStore', () => ({
  useBodyTestsStore: vi.fn(),
}));

import { useBodyTestsStore } from '@/stores/bodyTestsStore';
import { TrainerMemberBodyTestsPage } from '@/pages/trainer/member-body-tests';

const mockCreateTest = vi.fn();
const mockFetchTests = vi.fn();

function renderBodyTestsPage(memberId = 'member-1') {
  return render(
    <MemoryRouter initialEntries={[`/trainer/members/${memberId}/body-tests`]}>
      <Routes>
        <Route path="/trainer/members/:id/body-tests" element={<TrainerMemberBodyTestsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TrainerMemberBodyTestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTest.mockResolvedValue(undefined);
    mockFetchTests.mockResolvedValue(undefined);

    vi.mocked(useBodyTestsStore).mockReturnValue({
      testsByMember: {},
      isLoading: false,
      error: null,
      fetchTests: mockFetchTests,
      createTest: mockCreateTest,
      deleteTest: vi.fn(),
      exportCsv: vi.fn(),
    } as ReturnType<typeof useBodyTestsStore>);
  });

  describe('create', () => {
    it('createTest called with protocol and numeric measurements', async () => {
      renderBodyTestsPage('member-1');

      fireEvent.click(screen.getByRole('button', { name: /new test/i }));

      // Dialog opens — fill in the fields
      await screen.findByRole('dialog');

      // Protocol is already '3site', fill measurements
      fireEvent.change(screen.getByLabelText(/body weight/i), { target: { value: '75' } });
      fireEvent.change(screen.getByLabelText(/chest/i), { target: { value: '12' } });
      fireEvent.change(screen.getByLabelText(/abdominal/i), { target: { value: '22' } });
      fireEvent.change(screen.getByLabelText(/thigh/i), { target: { value: '16' } });

      fireEvent.click(screen.getByRole('button', { name: /save test/i }));

      await waitFor(() => {
        expect(mockCreateTest).toHaveBeenCalledWith('member-1', expect.objectContaining({
          protocol: '3site',
          weight: 75,
          chest: 12,
          abdominal: 22,
          thigh: 16,
        }));
      });
    });
  });
});
