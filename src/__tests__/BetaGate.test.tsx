import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BetaGate, deriveBetaToken } from '../components/BetaGate';

describe('BetaGate', () => {
  const originalFetch = global.fetch;

  // SHA-256 over 'ninerlog-beta:v1:' + 'secret123' — the value the server's
  // generated nginx map holds, and therefore the only thing the client sends.
  const DERIVED = '243eb6a0d301964569bd40f2f30d5325d3410c1aa3be55da50e40d69b0cb4884';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('renders children immediately when gate is disabled', async () => {
    // /beta-verify returns 200 without token = gate disabled
    global.fetch = vi.fn().mockResolvedValue({ status: 200 });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
  });

  it('shows password form when gate is enabled and no stored token', async () => {
    // First call (isGateEnabled): 403 = gate enabled
    // No stored token, so no second call
    global.fetch = vi.fn().mockResolvedValue({ status: 403 });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    await waitFor(() => {
      expect(screen.getByText('NinerLog Beta')).toBeInTheDocument();
      expect(screen.getByLabelText('Beta access code')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enter/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });

  it('derives the token with the shared domain-separation prefix', async () => {
    // Guards the contract with docker-entrypoint.sh: if BETA_TOKEN_PREFIX
    // drifts on either side, the gate rejects every correct access code.
    await expect(deriveBetaToken('secret123')).resolves.toBe(DERIVED);
  });

  it('grants access after entering valid code', async () => {
    const user = userEvent.setup();

    const sentTokens: (string | undefined)[] = [];
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      callCount++;
      const betaToken = init?.headers && (init.headers as Record<string, string>)['X-Beta-Token'];
      sentTokens.push(betaToken);
      // First call: isGateEnabled check (no token header) → 403
      if (callCount === 1) {
        return Promise.resolve({ status: 403 });
      }
      // Second call: verifyToken with the derived token → 200
      if (betaToken === DERIVED) {
        return Promise.resolve({ status: 200 });
      }
      return Promise.resolve({ status: 403 });
    });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    // Wait for the password prompt
    await waitFor(() => {
      expect(screen.getByLabelText('Beta access code')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Beta access code'), 'secret123');
    await user.click(screen.getByRole('button', { name: /enter/i }));

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });

    // The raw access code is never transmitted — only the derived token
    expect(sentTokens).not.toContain('secret123');
    expect(sentTokens).toContain(DERIVED);

    // ...and only the derived token is persisted
    expect(localStorage.getItem('ninerlog_beta_token_v1')).toBe(DERIVED);
  });

  it('shows error for invalid code', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({ status: 403 });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Beta access code')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Beta access code'), 'wrong');
    await user.click(screen.getByRole('button', { name: /enter/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid access code');
    });

    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });

  it('auto-authenticates with valid stored token', async () => {
    localStorage.setItem('ninerlog_beta_token_v1', 'stored-secret');

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      callCount++;
      // First call: isGateEnabled → 403 (gate enabled)
      if (callCount === 1) {
        return Promise.resolve({ status: 403 });
      }
      // Second call: verify stored token → 200
      const betaToken = init?.headers && (init.headers as Record<string, string>)['X-Beta-Token'];
      if (betaToken === 'stored-secret') {
        return Promise.resolve({ status: 200 });
      }
      return Promise.resolve({ status: 403 });
    });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
  });

  it('clears invalid stored token and shows password form', async () => {
    localStorage.setItem('ninerlog_beta_token_v1', 'expired-token');

    global.fetch = vi.fn().mockResolvedValue({ status: 403 });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    await waitFor(() => {
      expect(screen.getByText('NinerLog Beta')).toBeInTheDocument();
    });

    expect(localStorage.getItem('ninerlog_beta_token_v1')).toBeNull();
  });

  it('discards tokens stored under the pre-derivation key', async () => {
    // These were accepted by the old map and are worthless now; leaving them
    // in localStorage would just be a stale credential sitting on disk.
    localStorage.setItem('ninerlog_beta_token', 'legacy-hash');

    global.fetch = vi.fn().mockResolvedValue({ status: 403 });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    await waitFor(() => {
      expect(screen.getByText('NinerLog Beta')).toBeInTheDocument();
    });

    expect(localStorage.getItem('ninerlog_beta_token')).toBeNull();
  });

  it('disables Enter button when password is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 403 });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enter/i })).toBeDisabled();
    });
  });
});
