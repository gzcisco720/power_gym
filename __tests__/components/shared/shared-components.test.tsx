import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/shared/stat-card';
import { SectionHeader } from '@/components/shared/section-header';
import { EmptyState } from '@/components/shared/empty-state';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="BODY WEIGHT" value="91.2" unit="kg" />);
    expect(screen.getByText('BODY WEIGHT')).toBeInTheDocument();
    expect(screen.getByText('91.2')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('renders delta when provided', () => {
    render(<StatCard label="SESSIONS" value="42" delta="12-day streak" />);
    expect(screen.getByText('12-day streak')).toBeInTheDocument();
  });

  it('renders without delta', () => {
    render(<StatCard label="SESSIONS" value="42" />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Training Days" />);
    expect(screen.getByText('Training Days')).toBeInTheDocument();
  });

  it('renders action text when provided', () => {
    render(<SectionHeader title="Training Days" action="View all →" />);
    expect(screen.getByText('View all →')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders heading and description', () => {
    render(<EmptyState heading="No plan assigned" description="Your trainer hasn't assigned a plan yet." />);
    expect(screen.getByText('No plan assigned')).toBeInTheDocument();
    expect(screen.getByText("Your trainer hasn't assigned a plan yet.")).toBeInTheDocument();
  });
});
