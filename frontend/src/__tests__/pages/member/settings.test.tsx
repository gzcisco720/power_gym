import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    useReducedMotion: () => false,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/stores/accountStore', () => ({
  useAccountStore: vi.fn(),
}));

import { useAccountStore } from '@/stores/accountStore';
import { toast } from 'sonner';
import { MemberSettingsPage } from '@/pages/member/settings';

function renderPage() {
  return render(
    <MemoryRouter>
      <MemberSettingsPage />
    </MemoryRouter>,
  );
}

describe('MemberSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('updateProfile called with edited bio and shows toast', async () => {
      const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useAccountStore).mockReturnValue({
        profile: {
          id: 'member-1',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'member@test.com',
          mobile: null,
          avatarUrl: null,
          bio: 'original bio',
        },
        isLoading: false,
        error: null,
        fetchProfile: vi.fn(),
        updateProfile: mockUpdateProfile,
        changePassword: vi.fn(),
        changeEmail: vi.fn(),
        reset: vi.fn(),
      } as ReturnType<typeof useAccountStore>);

      renderPage();

      // Bio textarea should show current value
      const bioTextarea = screen.getByRole('textbox', { name: /bio/i });
      fireEvent.change(bioTextarea, { target: { value: 'updated bio content' } });

      const saveBtn = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ bio: 'updated bio content' }),
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Settings saved');
      });
    });
  });
});
