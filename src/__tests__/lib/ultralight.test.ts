import { describe, it, expect } from 'vitest';
import { isGermanULAuthority, looksLikeULLicence } from '../../lib/ultralight';

describe('isGermanULAuthority', () => {
  it.each([
    ['LBA', true],
    ['dulv', true],
    [' DAeC ', true],
    ['DAEC', true],
    ['EASA', false],
    ['FAA', false],
    ['', false],
    [null, false],
  ])('%s → %s', (authority, want) => {
    expect(isGermanULAuthority(authority)).toBe(want);
  });
});

describe('looksLikeULLicence', () => {
  it.each([
    ['UL', true],
    ['ul', true],
    ['UL-Lizenz', true],
    ['Ultralight', true],
    ['Luftsportgeräteführer Ultraleicht', true],
    ['PPL', false],
    ['SPL', false],
    ['ULM', false],
    ['', false],
    [undefined, false],
  ])('%s → %s', (licenseType, want) => {
    expect(looksLikeULLicence(licenseType)).toBe(want);
  });
});
