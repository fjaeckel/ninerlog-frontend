import { useState, useEffect, type ReactNode } from 'react';

const BETA_TOKEN_KEY = 'pilotlog_beta_token';

/**
 * Returns the stored beta token, or null if not set.
 * Can be used by API clients to attach the X-Beta-Token header.
 */
export function getBetaToken(): string | null {
  return localStorage.getItem(BETA_TOKEN_KEY);
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('/beta-verify', {
      method: 'GET',
      headers: { 'X-Beta-Token': token },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function isGateEnabled(): Promise<boolean> {
  try {
    // If /beta-verify returns 200 without a token, the gate is disabled
    const res = await fetch('/beta-verify', { method: 'GET' });
    return res.status !== 200;
  } catch {
    // If the endpoint is unreachable (e.g. dev mode), skip the gate
    return false;
  }
}

/**
 * Beta access gate. When BETA_PASSWORD is set on the server, users must enter
 * the access code before they can use the application. The code is persisted
 * in localStorage so users only need to enter it once per browser.
 *
 * When no BETA_PASSWORD is configured, the gate is transparent and children
 * render immediately.
 */
export function BetaGate({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      // First check if the gate is even enabled
      const enabled = await isGateEnabled();
      if (!enabled) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // Gate is enabled — check if we have a stored token
      const stored = localStorage.getItem(BETA_TOKEN_KEY);
      if (stored) {
        const valid = await verifyToken(stored);
        if (valid) {
          setAuthorized(true);
        } else {
          localStorage.removeItem(BETA_TOKEN_KEY);
        }
      }
      setChecking(false);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const valid = await verifyToken(password);
    if (valid) {
      localStorage.setItem(BETA_TOKEN_KEY, password);
      setAuthorized(true);
    } else {
      setError('Invalid access code');
    }
    setSubmitting(false);
  }

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        Loading...
      </div>
    );
  }

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#1e293b',
        padding: '2.5rem',
        borderRadius: '0.75rem',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✈️</div>
          <h1 style={{
            color: '#f1f5f9',
            fontSize: '1.5rem',
            fontWeight: 600,
            margin: '0 0 0.25rem',
          }}>
            PilotLog Beta
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.875rem',
            margin: 0,
          }}>
            Enter your access code to continue
          </p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          placeholder="Access code"
          autoFocus
          aria-label="Beta access code"
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: error ? '1px solid #ef4444' : '1px solid #334155',
            background: '#0f172a',
            color: '#f1f5f9',
            fontSize: '1rem',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        {error && (
          <p role="alert" style={{
            color: '#ef4444',
            fontSize: '0.8125rem',
            margin: '0.5rem 0 0',
          }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!password || submitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: password && !submitting ? '#3b82f6' : '#1e3a5f',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: password && !submitting ? 'pointer' : 'not-allowed',
            marginTop: '1rem',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Verifying...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
