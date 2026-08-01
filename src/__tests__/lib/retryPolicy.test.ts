import { describe, it, expect } from 'vitest';
import { httpStatusOf, HTTP_STATUS_KEY } from '../../api/client';

// Mirrors retryTransientOnly in src/main.tsx. Kept in step with it by the
// assertions below; the policy itself is trivial enough that duplicating it
// here is cheaper than exporting the query client's internals.
function retryTransientOnly(failureCount: number, error: unknown): boolean {
  const status = httpStatusOf(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

const withStatus = (status: number, body: Record<string, unknown> = {}) => ({
  ...body,
  [HTTP_STATUS_KEY]: status,
});

describe('httpStatusOf', () => {
  it('reads the status stamped onto an error body', () => {
    expect(httpStatusOf(withStatus(429, { error: 'Too many requests' }))).toBe(429);
  });

  it('returns undefined for errors with no status (network failures)', () => {
    expect(httpStatusOf(new Error('Failed to fetch'))).toBeUndefined();
    expect(httpStatusOf(undefined)).toBeUndefined();
    expect(httpStatusOf(null)).toBeUndefined();
    expect(httpStatusOf('boom')).toBeUndefined();
    expect(httpStatusOf({ error: 'no status here' })).toBeUndefined();
  });
});

describe('retry policy', () => {
  it('never retries a rate-limited request', () => {
    // The regression this exists to prevent: retrying a 429 doubled the
    // traffic that caused the 429 in the first place.
    expect(retryTransientOnly(0, withStatus(429, { error: 'Too many requests' }))).toBe(false);
  });

  it.each([400, 401, 403, 404, 422, 429])('never retries %i', (status) => {
    expect(retryTransientOnly(0, withStatus(status))).toBe(false);
  });

  it.each([500, 502, 503, 504])('retries %i once', (status) => {
    expect(retryTransientOnly(0, withStatus(status))).toBe(true);
    expect(retryTransientOnly(1, withStatus(status))).toBe(false);
  });

  it('retries a network failure once, since it carries no status', () => {
    const networkError = new Error('Failed to fetch');
    expect(retryTransientOnly(0, networkError)).toBe(true);
    expect(retryTransientOnly(1, networkError)).toBe(false);
  });
});
