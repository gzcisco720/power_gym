import { render, screen, fireEvent } from '@testing-library/react';
import { DayCompleteConfirmDialog } from '@/components/self-tracking/day-complete-confirm-dialog';

describe('DayCompleteConfirmDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    onConfirm: jest.fn(),
    submitting: false,
  };

  beforeEach(() => {
    baseProps.onOpenChange = jest.fn();
    baseProps.onConfirm = jest.fn();
  });

  it('state A — all meals completed: shows Submit + Cancel', () => {
    render(
      <DayCompleteConfirmDialog
        {...baseProps}
        totalMeals={4}
        completedMeals={4}
        sealedKcal={2000}
        totalKcal={2000}
      />,
    );
    expect(screen.getByRole('button', { name: /^submit$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit completed only/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark all/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    expect(baseProps.onConfirm).toHaveBeenCalledWith({ markAll: false });
  });

  it('state B — partial: shows Mark all + Submit completed only + Cancel', () => {
    render(
      <DayCompleteConfirmDialog
        {...baseProps}
        totalMeals={4}
        completedMeals={3}
        sealedKcal={1800}
        totalKcal={2000}
      />,
    );
    const markAllBtn = screen.getByRole('button', { name: /mark all & submit/i });
    const submitOnlyBtn = screen.getByRole('button', { name: /submit completed only/i });
    expect(markAllBtn).toBeInTheDocument();
    expect(submitOnlyBtn).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();

    fireEvent.click(markAllBtn);
    expect(baseProps.onConfirm).toHaveBeenCalledWith({ markAll: true });

    fireEvent.click(submitOnlyBtn);
    expect(baseProps.onConfirm).toHaveBeenCalledWith({ markAll: false });
  });

  it('state C — no meals completed: shows Mark all + Cancel only', () => {
    render(
      <DayCompleteConfirmDialog
        {...baseProps}
        totalMeals={4}
        completedMeals={0}
        sealedKcal={0}
        totalKcal={2000}
      />,
    );
    expect(screen.getByRole('button', { name: /mark all & submit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit completed only/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('Cancel calls onOpenChange(false) and not onConfirm', () => {
    render(
      <DayCompleteConfirmDialog
        {...baseProps}
        totalMeals={4}
        completedMeals={2}
        sealedKcal={900}
        totalKcal={2000}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });
});
