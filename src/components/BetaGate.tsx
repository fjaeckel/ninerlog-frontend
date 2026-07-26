import { useState, useEffect, type ReactNode } from 'react';
import { APP_NAME } from '../lib/config';

const BETA_TOKEN_KEY = 'ninerlog_beta_token_v1';

// Key used before the token derivation changed. Its values are no longer
// accepted by the server, so they are cleared rather than migrated.
const LEGACY_BETA_TOKEN_KEY = 'ninerlog_beta_token';

// Domain separation for the derived token. Must stay byte-identical to
// BETA_TOKEN_PREFIX in docker-entrypoint.sh — the server compares against
// SHA-256 over exactly this prefix plus the access code. It is not a secret;
// it exists so a leaked token is not a bare SHA-256 of a short, frequently
// reused string that a rainbow table would reverse to the code itself.
const BETA_TOKEN_PREFIX = 'ninerlog-beta:v1:';

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives the value sent in X-Beta-Token from the access code the user typed.
 * The raw code never leaves this function: it is not sent to the server, not
 * persisted, and not written into any nginx config. The derived token is the
 * only credential the gate accepts, so it is what we transmit and store.
 */
export async function deriveBetaToken(accessCode: string): Promise<string> {
  return sha256Hex(BETA_TOKEN_PREFIX + accessCode);
}

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
  // The public signing page is opened by an instructor with no NinerLog
  // account (from an emailed or shared link) — they can't have a beta
  // access code, so this path skips the gate entirely.
  const bypassGate =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/sign');

  const [authorized, setAuthorized] = useState(bypassGate);
  const [checking, setChecking] = useState(!bypassGate);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bypassGate) return;
    (async () => {
      // First check if the gate is even enabled
      const enabled = await isGateEnabled();
      if (!enabled) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // Tokens under the old key can no longer be verified — drop them so a
      // stale value doesn't linger in localStorage after the re-prompt.
      localStorage.removeItem(LEGACY_BETA_TOKEN_KEY);

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

    // Derive first, verify second: the server only ever sees the derived
    // token, so the access code itself never reaches the wire or the logs.
    const token = await deriveBetaToken(password);
    const valid = await verifyToken(token);
    if (valid) {
      localStorage.setItem(BETA_TOKEN_KEY, token);
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
            {APP_NAME} Beta
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
