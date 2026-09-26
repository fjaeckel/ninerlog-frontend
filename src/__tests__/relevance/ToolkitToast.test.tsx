import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToolkitToast } from '../../components/relevance/ToolkitToast';
import { gliderProfile } from '../../test/pilotProfile';
import type { PilotProfile } from '../../hooks/usePilotProfile';

const GET = vi.fn();
const PATCH = vi.fn();
vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => GET(...args),
    PATCH: (...args: unknown[]) => PATCH(...args),
  },
}));

/** Anna: aeroplane acknowledged, glider training by dual flights, not yet acknowledged. */
const annaProfile = (): PilotProfile => {
  const p = gliderProfile({ pendingAcknowledgement: ['SAILPLANE'] });
  p.disciplines[2] = {
    ...p.disciplines[2],
    status: 'training',
    evidence: [
      { source: 'AIRCRAFT', strength: 'recent', ref: 'D-1234' },
      { source: 'FLIGHTS_DUAL', strength: 'recent', ref: '2 dual flights, last 2026-09-20' },
    ],
  };
  return p;
};

const renderToast = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToolkitToast />
    </QueryClientProvider>,
  );
};

describe('ToolkitToast', () => {
  beforeEach(() => vi.clearAllMocks());

  it('N1: explains a training toolkit by its dual flights', async () => {
    GET.mockResolvedValue({ data: annaProfile(), error: undefined });
    renderToast();
    expect(
      await screen.findByText('Glider toolkit turned on — because you logged 2 dual flights, last 2026\u201109\u201120.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders nothing when nothing is pending', async () => {
    GET.mockResolvedValue({ data: gliderProfile(), error: undefined });
    const { container } = renderToast();
    await waitFor(() => expect(GET).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('Keep acknowledges the toolkit', async () => {
    GET.mockResolvedValue({ data: annaProfile(), error: undefined });
    PATCH.mockResolvedValue({ data: gliderProfile(), error: undefined });
    renderToast();
    await userEvent.click(await screen.findByRole('button', { name: 'Keep' }));
    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', { body: { acknowledge: ['SAILPLANE'] } });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('Turn off sets the intent to off and acknowledges', async () => {
    GET.mockResolvedValue({ data: annaProfile(), error: undefined });
    PATCH.mockResolvedValue({ data: gliderProfile(), error: undefined });
    renderToast();
    await userEvent.click(await screen.findByRole('button', { name: 'Turn off' }));
    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', {
      body: { intents: { SAILPLANE: 'off' }, acknowledge: ['SAILPLANE'] },
    });
  });

  it('Dismiss hides the notice without saving', async () => {
    GET.mockResolvedValue({ data: annaProfile(), error: undefined });
    renderToast();
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(PATCH).not.toHaveBeenCalled();
  });

  it('keeps the notice and says so when saving fails', async () => {
    GET.mockResolvedValue({ data: annaProfile(), error: undefined });
    PATCH.mockResolvedValue({ data: undefined, error: { error: 'boom' } });
    renderToast();
    await userEvent.click(await screen.findByRole('button', { name: 'Keep' }));
    expect(await screen.findByText('Could not save. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('ignores a pending discipline the client does not know', async () => {
    GET.mockResolvedValue({ data: gliderProfile({ pendingAcknowledgement: ['BALLOON' as never] }), error: undefined });
    const { container } = renderToast();
    await waitFor(() => expect(GET).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
