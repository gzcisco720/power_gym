import { render, screen, fireEvent } from '@testing-library/react';
import { RecurringScopeDialog } from '@/components/calendar/recurring-scope-dialog';

describe('RecurringScopeDialog', () => {
  it('renders three scope options', () => {
    render(<RecurringScopeDialog open onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText(/This occurrence only/i)).toBeInTheDocument();
    expect(screen.getByText(/This and all future/i)).toBeInTheDocument();
    expect(screen.getByText(/All occurrences/i)).toBeInTheDocument();
  });

  it('calls onConfirm with selected scope', () => {
    const onConfirm = jest.fn();
    render(<RecurringScopeDialog open onConfirm={onConfirm} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByText(/This and all future/i));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith('future');
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = jest.fn();
    render(<RecurringScopeDialog open onConfirm={jest.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
