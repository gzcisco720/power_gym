import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

import { DayAlreadyLoggedDialog } from '@/components/self-tracking/day-already-logged-dialog';

const defaultProps = {
  open: true,
  dayName: 'Push Day',
  sessionId: 'sess-abc',
  basePath: '/trainer/my-training' as const,
  onClose: jest.fn(),
};

describe('DayAlreadyLoggedDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title "Already trained today" when open', () => {
    render(<DayAlreadyLoggedDialog {...defaultProps} />);
    expect(screen.getByText('Already trained today')).toBeInTheDocument();
  });

  it('renders the dayName in the description text', () => {
    render(<DayAlreadyLoggedDialog {...defaultProps} dayName="Leg Day" />);
    expect(screen.getByText(/Leg Day/)).toBeInTheDocument();
  });

  it('"View session →" link has href pointing to basePath/session/sessionId', () => {
    render(
      <DayAlreadyLoggedDialog
        {...defaultProps}
        basePath="/owner/my-training"
        sessionId="sess-xyz"
      />,
    );
    const link = screen.getByRole('link', { name: /view session/i });
    expect(link).toHaveAttribute('href', '/owner/my-training/session/sess-xyz');
  });

  it('"Got it" button calls onClose', () => {
    const onClose = jest.fn();
    render(<DayAlreadyLoggedDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render content when open=false', () => {
    render(<DayAlreadyLoggedDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Already trained today')).not.toBeInTheDocument();
  });
});
