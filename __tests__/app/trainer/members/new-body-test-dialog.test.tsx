import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewBodyTestDialog } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/new-body-test-dialog';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

global.fetch = jest.fn();

beforeEach(() => jest.clearAllMocks());

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: /new test/i }));
}

describe('NewBodyTestDialog — Step 1', () => {
  it('renders a trigger button labeled "New Test"', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    expect(screen.getByRole('button', { name: /new test/i })).toBeInTheDocument();
  });

  it('opens the dialog when trigger is clicked', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    openDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows Test Date, Protocol, Weight fields in Step 1', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    openDialog();
    expect(screen.getByLabelText(/test date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/protocol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^weight/i)).toBeInTheDocument();
  });

  it('displays read-only age and sex from profile in the header', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} defaultAge={30} defaultSex="female" />);
    openDialog();
    expect(screen.getByText(/age 30/i)).toBeInTheDocument();
    expect(screen.getByText(/female/i)).toBeInTheDocument();
  });

  it('does not render Age input or Sex radio (now read-only from profile)', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} defaultAge={30} defaultSex="female" />);
    openDialog();
    expect(screen.queryByRole('spinbutton', { name: /age/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /female/i })).not.toBeInTheDocument();
  });

  it('Next button is disabled when weight is empty', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    openDialog();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('Next button is enabled after weight is filled', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    openDialog();
    fireEvent.change(screen.getByLabelText(/^weight/i), { target: { value: '75' } });
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('advances to Step 2 when Next is clicked with weight filled', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} defaultAge={25} />);
    openDialog();
    fireEvent.change(screen.getByLabelText(/^weight/i), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('Goals section is collapsed by default', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    openDialog();
    expect(screen.queryByLabelText(/target weight/i)).not.toBeInTheDocument();
  });

  it('Goals section expands when toggled', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    openDialog();
    fireEvent.click(screen.getByRole('button', { name: /goals/i }));
    expect(screen.getByLabelText(/target weight/i)).toBeInTheDocument();
  });
});

function goToStep2(protocol = 'other') {
  render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} defaultAge={25} />);
  openDialog();
  fireEvent.change(screen.getByLabelText(/protocol/i), { target: { value: protocol } });
  fireEvent.change(screen.getByLabelText(/^weight/i), { target: { value: '75' } });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
}

describe('NewBodyTestDialog — Step 2', () => {
  it('shows Body Fat % input for "other" protocol', () => {
    goToStep2('other');
    expect(screen.getByLabelText(/^body fat/i)).toBeInTheDocument();
  });

  it('shows 3 site inputs for 3-site protocol', () => {
    goToStep2('3site');
    expect(screen.getByLabelText(/chest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/abdominal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/thigh/i)).toBeInTheDocument();
  });

  it('shows 7 site inputs for 7-site protocol', () => {
    goToStep2('7site');
    expect(screen.getByLabelText(/midaxillary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subscapular/i)).toBeInTheDocument();
  });

  it('shows 9 site inputs for 9-site protocol', () => {
    goToStep2('9site');
    expect(screen.getByLabelText(/bicep/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lumbar/i)).toBeInTheDocument();
  });

  it('Save button is disabled when fields are empty', () => {
    goToStep2('other');
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
  });

  it('Save button is enabled after Body Fat % is entered', () => {
    goToStep2('other');
    fireEvent.change(screen.getByLabelText(/^body fat/i), { target: { value: '15' } });
    expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled();
  });

  it('Back button returns to Step 1', () => {
    goToStep2('other');
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByLabelText(/test date/i)).toBeInTheDocument();
  });
});

describe('NewBodyTestDialog — Submit', () => {
  const mockTest = {
    _id: 't1',
    date: new Date().toISOString(),
    protocol: 'other' as const,
    weight: 75,
    bodyFatPct: 15,
    leanMassKg: 63.75,
    fatMassKg: 11.25,
    targetWeight: null,
    targetBodyFatPct: null,
  };

  it('calls POST /api/members/:id/body-tests on Save', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockTest });
    const onSaved = jest.fn();
    render(<NewBodyTestDialog memberId="m1" onSaved={onSaved} defaultAge={25} />);
    openDialog();
    fireEvent.change(screen.getByLabelText(/protocol/i), { target: { value: 'other' } });
    fireEvent.change(screen.getByLabelText(/^weight/i), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/^body fat/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/members/m1/body-tests',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(onSaved).toHaveBeenCalledWith(mockTest);
    });
  });

  it('calls toast.error when API returns error', async () => {
    const { toast } = await import('sonner');
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Bad input' }) });
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} defaultAge={25} />);
    openDialog();
    fireEvent.change(screen.getByLabelText(/protocol/i), { target: { value: 'other' } });
    fireEvent.change(screen.getByLabelText(/^weight/i), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/^body fat/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Bad input'));
  });
});
