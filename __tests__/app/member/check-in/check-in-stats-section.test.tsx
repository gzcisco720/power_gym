import { render, screen, fireEvent } from '@testing-library/react';
import { CheckInStatsSection } from '@/app/(dashboard)/member/check-in/_components/check-in-stats-section';

const defaultValues = {
  weight: '', waist: '', steps: '',
  exerciseMinutes: '', walkRunDistance: '', sleepHours: '',
};

describe('CheckInStatsSection', () => {
  it('renders all 6 stat labels', () => {
    render(<CheckInStatsSection values={defaultValues} onChange={jest.fn()} />);
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Waist')).toBeInTheDocument();
    expect(screen.getByText('Steps')).toBeInTheDocument();
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Walk / Run')).toBeInTheDocument();
    expect(screen.getByText('Sleep')).toBeInTheDocument();
  });

  it('renders all 6 unit labels', () => {
    render(<CheckInStatsSection values={defaultValues} onChange={jest.fn()} />);
    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByText('cm')).toBeInTheDocument();
    expect(screen.getByText('steps')).toBeInTheDocument();
    expect(screen.getByText('min')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
    expect(screen.getByText('hrs')).toBeInTheDocument();
  });

  it('uses text input with inputMode=decimal, not type=number', () => {
    render(<CheckInStatsSection values={defaultValues} onChange={jest.fn()} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('inputMode', 'decimal');
      expect(input).not.toHaveAttribute('type', 'number');
    });
  });

  it('calls onChange with correct field and value', () => {
    const onChange = jest.fn();
    render(<CheckInStatsSection values={defaultValues} onChange={onChange} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '72.5' } });
    expect(onChange).toHaveBeenCalledWith('weight', '72.5');
  });

  it('displays current values in inputs', () => {
    render(
      <CheckInStatsSection
        values={{ ...defaultValues, weight: '72.5', sleepHours: '7.5' }}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByDisplayValue('72.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7.5')).toBeInTheDocument();
  });
});
