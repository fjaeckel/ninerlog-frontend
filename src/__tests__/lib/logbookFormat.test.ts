import { describe, it, expect } from 'vitest';
import { logbookFormatForLicence } from '../../lib/logbookFormat';

describe('logbookFormatForLicence (mirrors LogbookFormatForLicence in the API)', () => {
  it.each([
    ['L Lena SPL', { licenseType: 'SPL', regulatoryAuthority: 'EASA', issuingAuthority: 'LBA' }, 'sailplane'],
    ['LAPL(S)', { licenseType: 'lapl(s) ', regulatoryAuthority: 'EASA', issuingAuthority: 'LBA' }, 'sailplane'],
    ['FAA glider', { licenseType: 'Glider', regulatoryAuthority: 'FAA', issuingAuthority: 'FAA' }, 'sailplane'],
    ['M Mehmet UL (DULV)', { licenseType: 'SPL', regulatoryAuthority: 'DULV', issuingAuthority: 'DULV' }, 'ultralight'],
    ['S Sabine UL licence type', { licenseType: 'UL', regulatoryAuthority: 'LBA', issuingAuthority: 'LBA' }, 'ultralight'],
    ['UL issued by DAeC', { licenseType: 'Sportpilot', regulatoryAuthority: 'LBA', issuingAuthority: 'DAeC' }, 'ultralight'],
    ['Ultraleicht text', { licenseType: 'Luftfahrerschein Ultraleicht', regulatoryAuthority: 'LBA', issuingAuthority: 'LBA' }, 'ultralight'],
    ['A1 Mark ATPL', { licenseType: 'ATPL(A)', regulatoryAuthority: 'EASA', issuingAuthority: 'LBA' }, 'easa'],
    ['PPL(A)', { licenseType: 'PPL(A)', regulatoryAuthority: 'EASA', issuingAuthority: 'LBA' }, 'easa'],
  ])('%s → %s', (_name, licence, want) => {
    expect(logbookFormatForLicence(licence)).toBe(want);
  });

  it('no licence → easa', () => {
    expect(logbookFormatForLicence(undefined)).toBe('easa');
  });
});
