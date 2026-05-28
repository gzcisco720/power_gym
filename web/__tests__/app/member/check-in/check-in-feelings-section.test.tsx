import { render, screen, fireEvent } from '@testing-library/react';
import { CheckInFeelingsSection } from '@/app/(dashboard)/member/check-in/_components/check-in-feelings-section';

const defaultRatings = {
  sleepQuality: 7, energy: 5, recovery: 6,
  stress: 3, fatigue: 4, hunger: 5, digestion: 9,
};

describe('CheckInFeelingsSection', () => {
  it('renders all 7 rating labels', () => {
    render(<CheckInFeelingsSection ratings={defaultRatings} onChange={jest.fn()} />);
    expect(screen.getByText('Sleep Quality')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByText('Recovery')).toBeInTheDocument();
    expect(screen.getByText('Stress')).toBeInTheDocument();
    expect(screen.getByText('Fatigue')).toBeInTheDocument();
    expect(screen.getByText('Hunger')).toBeInTheDocument();
    expect(screen.getByText('Digestion')).toBeInTheDocument();
  });

  it('displays current rating values', () => {
    render(<CheckInFeelingsSection ratings={defaultRatings} onChange={jest.fn()} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('calls onChange with correct key and value when slider changes', () => {
    const onChange = jest.fn();
    render(<CheckInFeelingsSection ratings={defaultRatings} onChange={onChange} />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith('sleepQuality', 8);
  });

  it('renders 7 range inputs', () => {
    render(<CheckInFeelingsSection ratings={defaultRatings} onChange={jest.fn()} />);
    expect(screen.getAllByRole('slider')).toHaveLength(7);
  });
});
