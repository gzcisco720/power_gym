import { render, screen, fireEvent } from '@testing-library/react';
import { CheckInDietSection } from '@/app/(dashboard)/member/check-in/_components/check-in-diet-section';

const defaultProps = {
  stuckToDiet: 'yes' as const,
  onStuckToDiet: jest.fn(),
  dietDetails: '',
  onDietDetails: jest.fn(),
  wellbeing: '',
  onWellbeing: jest.fn(),
  notes: '',
  onNotes: jest.fn(),
};

describe('CheckInDietSection', () => {
  it('renders all three diet toggle options', () => {
    render(<CheckInDietSection {...defaultProps} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('calls onStuckToDiet when a toggle button is clicked', () => {
    const onStuckToDiet = jest.fn();
    render(<CheckInDietSection {...defaultProps} onStuckToDiet={onStuckToDiet} />);
    fireEvent.click(screen.getByText('Partial'));
    expect(onStuckToDiet).toHaveBeenCalledWith('partial');
  });

  it('renders diet details, wellbeing, and notes textareas', () => {
    render(<CheckInDietSection {...defaultProps} />);
    expect(screen.getByPlaceholderText(/describe your diet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/how are you feeling/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/anything else/i)).toBeInTheDocument();
  });

  it('calls onDietDetails when diet textarea changes', () => {
    const onDietDetails = jest.fn();
    render(<CheckInDietSection {...defaultProps} onDietDetails={onDietDetails} />);
    fireEvent.change(screen.getByPlaceholderText(/describe your diet/i), {
      target: { value: 'Hit macros all week' },
    });
    expect(onDietDetails).toHaveBeenCalledWith('Hit macros all week');
  });

  it('displays passed-in values in textareas', () => {
    render(
      <CheckInDietSection
        {...defaultProps}
        dietDetails="Great week"
        wellbeing="Feeling good"
        notes="Nothing extra"
      />,
    );
    expect(screen.getByDisplayValue('Great week')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Feeling good')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nothing extra')).toBeInTheDocument();
  });
});
