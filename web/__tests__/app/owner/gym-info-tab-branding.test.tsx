import { render, screen, fireEvent } from '@testing-library/react';
import { GymInfoTab } from '@/app/(dashboard)/owner/settings/_components/gym-info-tab';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/app/(dashboard)/owner/settings/actions', () => ({
  updateGymInfoAction: jest.fn(),
}));

jest.mock('@/lib/actions/get-gym-asset-signature', () => ({
  getGymAssetSignatureAction: jest.fn().mockResolvedValue({ provider: 'local', uploadUrl: '/api/upload', folder: 'gym-logos' }),
}));
jest.mock('@/lib/storage/upload-file', () => ({
  uploadFile: jest.fn(),
}));

jest.mock('@/components/settings/logo-crop-dialog', () => ({
  LogoCropDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="logo-crop-dialog">crop</div> : null,
}));

beforeEach(() => {
  global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake-object-url');
  global.URL.revokeObjectURL = jest.fn();
});

describe('GymInfoTab branding section', () => {
  it('renders the Logo upload button', () => {
    render(<GymInfoTab gymInfo={null} />);
    expect(screen.getByRole('button', { name: /upload logo/i })).toBeInTheDocument();
  });

  it('renders the Login Logo upload button', () => {
    render(<GymInfoTab gymInfo={null} />);
    expect(screen.getByRole('button', { name: /upload login logo/i })).toBeInTheDocument();
  });

  it('shows existing logo preview when logoUrl is provided', () => {
    render(
      <GymInfoTab
        gymInfo={{
          name: 'Iron Club', address: null, phone: null, email: null,
          website: null, hours: null, description: null,
          logoUrl: 'https://cdn.example.com/logo.png',
          loginLogoUrl: null,
        }}
      />,
    );
    const img = screen.getByAltText('Gym logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('cdn.example.com');
  });

  it('shows crop dialog after a logo file is selected', () => {
    render(<GymInfoTab gymInfo={null} />);

    const inputs = document.querySelectorAll('input[type="file"]');
    const logoInput = inputs[0] as HTMLInputElement;

    const file = new File(['content'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(logoInput, 'files', { value: [file], configurable: true });
    fireEvent.change(logoInput);

    expect(screen.getByTestId('logo-crop-dialog')).toBeInTheDocument();
  });
});
