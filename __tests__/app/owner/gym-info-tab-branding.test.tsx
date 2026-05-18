import { render, screen } from '@testing-library/react';
import { GymInfoTab } from '@/app/(dashboard)/owner/settings/_components/gym-info-tab';

jest.mock('@/lib/actions/get-gym-asset-signature', () => ({
  getGymAssetSignatureAction: jest.fn().mockResolvedValue({ provider: 'local', uploadUrl: '/api/upload', folder: 'gym-logos' }),
}));
jest.mock('@/lib/storage/upload-file', () => ({
  uploadFile: jest.fn(),
}));

describe('GymInfoTab branding section', () => {
  it('renders the Logo upload button', () => {
    render(<GymInfoTab gymInfo={null} />);
    expect(screen.getByRole('button', { name: /upload logo/i })).toBeInTheDocument();
  });

  it('renders the Background upload button', () => {
    render(<GymInfoTab gymInfo={null} />);
    expect(screen.getByRole('button', { name: /upload background/i })).toBeInTheDocument();
  });

  it('shows existing logo preview when logoUrl is provided', () => {
    render(
      <GymInfoTab
        gymInfo={{
          name: 'Iron Club', address: null, phone: null, email: null,
          website: null, hours: null, description: null,
          logoUrl: 'https://cdn.example.com/logo.png',
          loginBgUrl: null,
        }}
      />,
    );
    const img = screen.getByAltText('Gym logo');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/logo.png');
  });
});
