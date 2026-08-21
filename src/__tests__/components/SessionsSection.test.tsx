import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionsSection } from '../../components/profile/SessionsSection';

const getMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => getMock(...args),
    DELETE: (...args: unknown[]) => deleteMock(...args),
  },
}));

const SESSIONS = {
  sessions: [
    {
      id: 's1',
      deviceLabel: 'Chrome on macOS',
      ipAddress: '203.0.113.7',
      createdAt: '2026-08-14T10:00:00Z',
      lastUsedAt: '2026-08-16T10:00:00Z',
      expiresAt: '2026-08-21T10:00:00Z',
      current: true,
    },
    {
      id: 's2',
      deviceLabel: 'Safari on iPhone',
      ipAddress: '198.51.100.24',
      createdAt: '2026-08-07T10:00:00Z',
      lastUsedAt: '2026-08-15T10:00:00Z',
      expiresAt: '2026-08-20T10:00:00Z',
      current: false,
    },
  ],
  maxSessions: 5,
};

const renderSection = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionsSection />
    </QueryClientProvider>
  );
};

describe('SessionsSection', () => {
  beforeEach(() => {
    getMock.mockReset();
    deleteMock.mockReset();
    getMock.mockResolvedValue({ data: SESSIONS, error: undefined });
    deleteMock.mockResolvedValue({ data: { revoked: 1 }, error: undefined });
  });

  afterEach(cleanup);

  it('lists every signed-in device', async () => {
    renderSection();

    expect(await screen.findByText('Chrome on macOS')).toBeInTheDocument();
    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.7', { exact: false })).toBeInTheDocument();
  });

  it('marks the calling device and states the session cap', async () => {
    renderSection();

    expect(await screen.findByText('This device')).toBeInTheDocument();
    expect(screen.getByText(/up to 5 devices/i)).toBeInTheDocument();
  });

  it('revokes a single session by id', async () => {
    renderSection();
    const user = userEvent.setup();

    const row = (await screen.findByText('Safari on iPhone')).closest('li');
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Sign out' }));

    expect(deleteMock).toHaveBeenCalledWith('/auth/sessions/{sessionId}', {
      params: { path: { sessionId: 's2' } },
    });
    expect(await screen.findByText(/signed out safari on iphone/i)).toBeInTheDocument();
  });

  it('revokes every other session in one call', async () => {
    deleteMock.mockResolvedValue({ data: { revoked: 1 }, error: undefined });
    renderSection();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /sign out all other devices \(1\)/i }));

    expect(deleteMock).toHaveBeenCalledWith('/auth/sessions');
  });

  it('offers no bulk sign-out when this is the only device', async () => {
    getMock.mockResolvedValue({
      data: { sessions: [SESSIONS.sessions[0]], maxSessions: 5 },
      error: undefined,
    });
    renderSection();

    expect(await screen.findByText('Chrome on macOS')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /all other devices/i })).not.toBeInTheDocument();
  });

  it('reports a failure to load rather than rendering an empty list', async () => {
    getMock.mockResolvedValue({ data: undefined, error: { message: 'boom' } });
    renderSection();

    expect(await screen.findByText(/could not load your signed-in devices/i)).toBeInTheDocument();
  });

  it('reports a failed revocation', async () => {
    deleteMock.mockResolvedValue({ data: undefined, error: { message: 'boom' } });
    renderSection();
    const user = userEvent.setup();

    const row = (await screen.findByText('Safari on iPhone')).closest('li');
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText(/could not sign that device out/i)).toBeInTheDocument();
  });
});
