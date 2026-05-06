import { render, screen, fireEvent } from '@testing-library/react';
import { MacroSummaryCard } from '@/components/nutrition/macro-summary-card';

// Mock MacroRing — keep test scope tight
jest.mock('@/components/nutrition/macro-ring', () => ({
  MacroRing: () => <div data-testid="macro-ring" />,
}));

describe('MacroSummaryCard', () => {
  const targets = { kcal: 2000, protein: 150, carbs: 200, fat: 60 };
  const actuals = {
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

  it('renders core page by default with actual/target rows + ring', () => {
    render(<MacroSummaryCard actuals={actuals} targets={targets} />);
    expect(screen.getByText(/1000/)).toBeInTheDocument();
    expect(screen.getByText(/2000/)).toBeInTheDocument(); // target
    expect(screen.getByTestId('macro-ring')).toBeInTheDocument();
  });

  it('switches to extended page on dot click', () => {
    render(<MacroSummaryCard actuals={actuals} targets={targets} />);
    const extendedDot = screen.getByLabelText('Extended macros');
    fireEvent.click(extendedDot);
    expect(screen.getByText(/Fiber/)).toBeInTheDocument();
    expect(screen.getByText(/Polyunsat/)).toBeInTheDocument();
  });

  it('shows em-dash for missing extended values', () => {
    const minimal = { kcal: 0, protein: 0, carbs: 0, fat: 0 }; // no extended
    render(<MacroSummaryCard actuals={minimal} targets={targets} />);
    fireEvent.click(screen.getByLabelText('Extended macros'));
    // 8 missing fields → at least 8 em-dashes
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(8);
  });
});
