import { describe, it, expect } from 'vitest';
import { parseLegalDocs, legalDocPath, legalDocUrl, isLegalDocId } from '../../lib/legal';

describe('parseLegalDocs', () => {
  it('returns nothing for an empty value', () => {
    expect(parseLegalDocs('')).toEqual([]);
    expect(parseLegalDocs('  ')).toEqual([]);
  });

  it('keeps known ids in display order and ignores the rest', () => {
    expect(parseLegalDocs('privacy, terms')).toEqual(['terms', 'privacy']);
    expect(parseLegalDocs('PRIVACY,imprint,terms,terms')).toEqual(['terms', 'privacy']);
    expect(parseLegalDocs('imprint')).toEqual([]);
  });
});

describe('legal doc helpers', () => {
  it('builds route and source urls', () => {
    expect(legalDocPath('terms')).toBe('/legal/terms');
    expect(legalDocUrl('privacy')).toBe('/legal/privacy.md');
    expect(legalDocUrl('privacy', 'de')).toBe('/legal/privacy.de.md');
  });

  it('recognises known ids only', () => {
    expect(isLegalDocId('terms')).toBe(true);
    expect(isLegalDocId('imprint')).toBe(false);
  });
});
