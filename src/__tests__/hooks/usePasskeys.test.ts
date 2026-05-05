import { describe, it, expect, vi, type Mock } from 'vitest';

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

import { passkeysSupported } from '../../hooks/usePasskeys';
import * as browser from '@simplewebauthn/browser';

describe('passkeysSupported', () => {
  it('returns true when @simplewebauthn/browser reports support', () => {
    (browser.browserSupportsWebAuthn as unknown as Mock).mockReturnValue(true);
    expect(passkeysSupported()).toBe(true);
  });

  it('returns false when @simplewebauthn/browser reports no support', () => {
    (browser.browserSupportsWebAuthn as unknown as Mock).mockReturnValue(false);
    expect(passkeysSupported()).toBe(false);
  });

  it('returns false when the underlying call throws', () => {
    (browser.browserSupportsWebAuthn as unknown as Mock).mockImplementation(() => {
      throw new Error('boom');
    });
    expect(passkeysSupported()).toBe(false);
  });
});
