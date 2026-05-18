import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/shared/app-shell';

jest.mock('next/navigation', () => ({ usePathname: () => '/owner', useRouter: () => ({}) }));

const baseProps = {
  role: 'owner' as const,
  userName: 'Jane Smith',
  children: <div />,
};

describe('AppShell gym branding', () => {
  it('shows gymBranding.name in sidebar when provided', () => {
    render(<AppShell {...baseProps} gymBranding={{ name: 'Iron Club', logoUrl: null }} />);
    expect(screen.getAllByText('Iron Club').length).toBeGreaterThan(0);
  });

  it('falls back to POWER GYM when gymBranding is not provided', () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getAllByText(/power gym/i).length).toBeGreaterThan(0);
  });

  it('renders circular logo image when logoUrl is set', () => {
    render(
      <AppShell
        {...baseProps}
        gymBranding={{ name: 'Iron Club', logoUrl: 'https://cdn.example.com/logo.png' }}
      />,
    );
    const img = screen.getAllByAltText('Gym logo')[0];
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/logo.png');
  });

  it('renders initial-letter fallback when logoUrl is null', () => {
    render(<AppShell {...baseProps} gymBranding={{ name: 'Iron Club', logoUrl: null }} />);
    // first letter 'I' rendered in the circle fallback
    expect(screen.getAllByText('I').length).toBeGreaterThan(0);
  });
});
