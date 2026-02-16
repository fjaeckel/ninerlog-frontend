import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BetaGate } from '../components/BetaGate';

describe('BetaGate', () => {
  const originalFetch = global.fetch;

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
      expect(screen.getByText('PilotLog Beta')).toBeInTheDocument();
      expect(screen.getByLabelText('Beta access code')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enter/i })).toBeInTheDocument();
    });

    expect(screen.queryByTestId('app-content')).not.toBeInTheDocument();
  });

  it('grants access after entering valid code', async () => {
    const user = userEvent.setup();

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      callCount++;
      // First call: isGateEnabled check (no token header) → 403
      if (callCount === 1) {
        return Promise.resolve({ status: 403 });
      }
      // Second call: verifyToken with the entered password → 200
      const betaToken = init?.headers && (init.headers as Record<string, string>)['X-Beta-Token'];
      if (betaToken === 'secret123') {
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

    expect(localStorage.getItem('pilotlog_beta_token')).toBe('secret123');
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
    localStorage.setItem('pilotlog_beta_token', 'stored-secret');

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
    localStorage.setItem('pilotlog_beta_token', 'expired-token');

    global.fetch = vi.fn().mockResolvedValue({ status: 403 });

    render(
      <BetaGate>
        <div data-testid="app-content">App loaded</div>
      </BetaGate>
    );

    await waitFor(() => {
      expect(screen.getByText('PilotLog Beta')).toBeInTheDocument();
    });

    expect(localStorage.getItem('pilotlog_beta_token')).toBeNull();
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
