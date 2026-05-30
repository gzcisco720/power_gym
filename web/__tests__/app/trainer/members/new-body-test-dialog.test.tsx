import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewBodyTestDialog } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/new-body-test-dialog';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

global.fetch = jest.fn();

beforeEach(() => jest.clearAllMocks());

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: /new test/i }));
}

function openWith(protocol: string, weight = '75', age = 25) {
  render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} defaultAge={age} />);
  openDialog();
  fireEvent.change(screen.getByLabelText(/protocol/i), { target: { value: protocol } });
  fireEvent.change(screen.getByLabelText(/^weight/i), { target: { value: weight } });
}

describe('NewBodyTestDialog — basic shell', () => {
  it('renders a trigger button labeled "New Test"', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    expect(screen.getByRole('button', { name: /new test/i })).toBeInTheDocument();
  });

  it('opens the dialog when trigger is clicked', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} />);
    openDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows Test Date, Protocol, Weight fields', () => {
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

describe('NewBodyTestDialog — measurement inputs', () => {
  it('shows Body Fat % input for "other" protocol', () => {
    openWith('other');
    expect(screen.getByLabelText(/^body fat/i)).toBeInTheDocument();
  });

  it('shows 3 site inputs for 3-site protocol', () => {
    openWith('3site');
    expect(screen.getByLabelText(/chest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/abdominal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/thigh/i)).toBeInTheDocument();
  });

  it('shows 7 site inputs for 7-site protocol', () => {
    openWith('7site');
    expect(screen.getByLabelText(/midaxillary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subscapular/i)).toBeInTheDocument();
  });

  it('shows 9 site inputs for 9-site protocol', () => {
    openWith('9site');
    expect(screen.getByLabelText(/bicep/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lumbar/i)).toBeInTheDocument();
  });
});

describe('NewBodyTestDialog — Save button gating', () => {
  it('Save is disabled when weight is empty', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} defaultAge={25} />);
    openDialog();
    fireEvent.change(screen.getByLabelText(/protocol/i), { target: { value: 'other' } });
    fireEvent.change(screen.getByLabelText(/^body fat/i), { target: { value: '15' } });
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
  });

  it('Save is disabled when measurement fields are empty', () => {
    openWith('other');
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
  });

  it('Save is enabled after weight + Body Fat % are entered', () => {
    openWith('other');
    fireEvent.change(screen.getByLabelText(/^body fat/i), { target: { value: '15' } });
    expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled();
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
    fireEvent.change(screen.getByLabelText(/^body fat/i), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Bad input'));
  });
});

describe('NewBodyTestDialog — Vs Last Test comparison', () => {
  const previousTest = {
    _id: 'prev1',
    date: '2026-04-01T00:00:00.000Z',
    protocol: 'other' as const,
    weight: 80,
    bodyFatPct: 18,
    leanMassKg: 65.6,
    fatMassKg: 14.4,
    targetWeight: null,
    targetBodyFatPct: null,
  };

  it('renders the comparison block with placeholders when previousTest is absent', () => {
    render(<NewBodyTestDialog memberId="m1" onSaved={jest.fn()} defaultAge={25} />);
    openDialog();
    expect(screen.getByText(/vs last test/i)).toBeInTheDocument();
    expect(screen.queryByText(/recomp|cut|bulk|regression|maintain/i)).not.toBeInTheDocument();
  });

  it('renders the comparison block when previousTest is provided', () => {
    render(
      <NewBodyTestDialog
        memberId="m1"
        onSaved={jest.fn()}
        defaultAge={25}
        previousTest={previousTest}
      />,
    );
    openDialog();
    expect(screen.getByText(/vs last test/i)).toBeInTheDocument();
  });

  it('shows a verdict badge once measurements yield deltas', () => {
    render(
      <NewBodyTestDialog
        memberId="m1"
        onSaved={jest.fn()}
        defaultAge={25}
        previousTest={previousTest}
      />,
    );
    openDialog();
    fireEvent.change(screen.getByLabelText(/protocol/i), { target: { value: 'other' } });
    fireEvent.change(screen.getByLabelText(/^weight/i), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText(/^body fat/i), { target: { value: '15' } });
    expect(
      screen.getByText(/recomp|cut|bulk|regression|maintain/i),
    ).toBeInTheDocument();
  });

  it('warns when the protocol differs from the previous test', () => {
    render(
      <NewBodyTestDialog
        memberId="m1"
        onSaved={jest.fn()}
        defaultAge={25}
        previousTest={previousTest}
      />,
    );
    openDialog();
    fireEvent.change(screen.getByLabelText(/protocol/i), { target: { value: '3site' } });
    expect(screen.getByText(/method changed/i)).toBeInTheDocument();
  });
});
