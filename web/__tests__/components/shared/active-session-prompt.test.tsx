import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActiveSessionPrompt } from '@/components/shared/active-session-prompt';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const baseProps = {
  dayName: 'Push',
  continueHref: '/trainer/my-training/session/S1',
  sealEndpoint: '/api/me/workout-logs/S1/seal',
  deleteEndpoint: '/api/me/workout-logs/S1',
};

function localIso(d: Date): string {
  return d.toISOString();
}

describe('ActiveSessionPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  it('renders the same-day banner with Continue + Discard, not the cross-day modal', () => {
    // Use the start of today + 1 minute so the date check is timezone- and
    // wall-clock-independent (running near midnight would otherwise cross days).
    const now = new Date();
    const startedAt = new Date(now);
    startedAt.setHours(0, 1, 0, 0);
    render(
      <ActiveSessionPrompt
        {...baseProps}
        startedAtIso={localIso(startedAt)}
        lastActivityAtIso={localIso(startedAt)}
      />,
    );
    expect(screen.getByText(/Push session in progress/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue/i })).toHaveAttribute(
      'href',
      baseProps.continueHref,
    );
    expect(screen.getByRole('button', { name: /discard active session/i })).toBeInTheDocument();
    // Cross-day modal title should NOT be present
    expect(screen.queryByText(/unfinished workout from/i)).not.toBeInTheDocument();
  });

  it('renders the cross-day modal when startedAt is on a previous calendar day', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    render(
      <ActiveSessionPrompt
        {...baseProps}
        startedAtIso={localIso(yesterday)}
        lastActivityAtIso={localIso(yesterday)}
      />,
    );
    expect(screen.getByText(/unfinished workout from/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^discard$/i })).toBeInTheDocument();
    // Banner CTA "Continue" must NOT appear in cross-day mode (force user choice)
    expect(screen.queryByRole('link', { name: /continue/i })).not.toBeInTheDocument();
  });

  it('cross-day "Save it" calls the seal endpoint', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    render(
      <ActiveSessionPrompt
        {...baseProps}
        startedAtIso={localIso(yesterday)}
        lastActivityAtIso={localIso(yesterday)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save it/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(baseProps.sealEndpoint, { method: 'POST' }),
    );
  });

  it('cross-day "Discard" calls the delete endpoint', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    render(
      <ActiveSessionPrompt
        {...baseProps}
        startedAtIso={localIso(yesterday)}
        lastActivityAtIso={localIso(yesterday)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^discard$/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(baseProps.deleteEndpoint, { method: 'DELETE' }),
    );
  });

  it('same-day "Discard" calls the delete endpoint', async () => {
    const startedAt = new Date();
    startedAt.setHours(0, 1, 0, 0);
    render(
      <ActiveSessionPrompt
        {...baseProps}
        startedAtIso={localIso(startedAt)}
        lastActivityAtIso={localIso(startedAt)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /discard active session/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(baseProps.deleteEndpoint, { method: 'DELETE' }),
    );
  });
});
