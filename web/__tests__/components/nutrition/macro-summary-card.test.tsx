import { render, screen, fireEvent } from '@testing-library/react';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';

// Mock MacroRing — keep test scope tight
jest.mock('@/components/nutrition/macro-ring', () => ({
  MacroRing: () => <div data-testid="macro-ring" />,
}));

describe('MacroSummaryCard', () => {
  const macros = {
    kcal: 1000,
    protein: 75,
    carbs: 100,
    fat: 30,
    fiber: 25,
    sugar: 49,
    polyols: 0,
    salt: 2,
    saturated: 24,
    polyunsaturated: 10,
    monounsaturated: 32,
    sodium: 800,
  };

  it('renders core page by default with kcal centered on ring + macro bars', () => {
    render(<MacroSummaryCard macros={macros} />);
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByTestId('macro-ring')).toBeInTheDocument();
  });

  it('switches to extended page on dot click', () => {
    render(<MacroSummaryCard macros={macros} />);
    fireEvent.click(screen.getByLabelText('Extended macros'));
    expect(screen.getByText('Fiber')).toBeInTheDocument();
    expect(screen.getByText('Polyunsaturated')).toBeInTheDocument();
    expect(screen.getByText('Saturated')).toBeInTheDocument();
  });

  it('toggles pages with arrow keys', () => {
    render(<MacroSummaryCard macros={macros} />);
    const carousel = screen.getByRole('group');
    fireEvent.keyDown(carousel, { key: 'ArrowRight' });
    expect(screen.getByText('Fiber')).toBeInTheDocument();
    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
    expect(screen.getByText('Protein')).toBeInTheDocument();
  });

  it('shows em-dash for missing extended values', () => {
    const minimal = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    render(<MacroSummaryCard macros={minimal} />);
    fireEvent.click(screen.getByLabelText('Extended macros'));
    expect(screen.getAllByText('—').length).toBe(7);
  });
});
