import { describe, it, expect } from 'vitest';
import {
  holdsFaaLicence,
  picWhileDualPayload,
  receivesInstruction,
  showPicWhileDual,
} from '../../components/flights/picWhileDual';

const faa = [{ regulatoryAuthority: 'FAA' }];
const easa = [{ regulatoryAuthority: 'EASA' }, { regulatoryAuthority: 'DULV' }];

describe('receivesInstruction', () => {
  it('is true with an instructor or examiner on board', () => {
    expect(receivesInstruction([{ role: 'Instructor' }])).toBe(true);
    expect(receivesInstruction([{ role: 'Examiner' }])).toBe(true);
  });

  it('is false for other crew', () => {
    expect(receivesInstruction([])).toBe(false);
    expect(receivesInstruction([{ role: 'Passenger' }, { role: 'Student' }, { role: 'PIC' }])).toBe(false);
  });
});

describe('holdsFaaLicence', () => {
  it('matches FAA case-insensitively as a word', () => {
    expect(holdsFaaLicence(faa)).toBe(true);
    expect(holdsFaaLicence([{ regulatoryAuthority: 'faa (USA)' }])).toBe(true);
    expect(holdsFaaLicence(easa)).toBe(false);
    expect(holdsFaaLicence([])).toBe(false);
  });
});

describe('showPicWhileDual', () => {
  it('T8: shows for an FAA licence holder receiving instruction', () => {
    expect(showPicWhileDual({ receivingInstruction: true, licences: faa, declared: false })).toBe(true);
  });

  it('G1/G2: folds for EASA-only pilots', () => {
    expect(showPicWhileDual({ receivingInstruction: true, licences: easa, declared: false })).toBe(false);
  });

  it('data always wins: shows on a flight already logged as PIC and dual', () => {
    expect(showPicWhileDual({ receivingInstruction: true, licences: easa, declared: true })).toBe(true);
  });

  it('fails open while the licences are unknown', () => {
    expect(showPicWhileDual({ receivingInstruction: true, licences: undefined, declared: false })).toBe(true);
  });

  it('never shows without an instructor or examiner', () => {
    expect(showPicWhileDual({ receivingInstruction: false, licences: faa, declared: true })).toBe(false);
  });
});

describe('picWhileDualPayload', () => {
  it('sends nothing while the toggle is not rendered', () => {
    expect(picWhileDualPayload(false, true, undefined)).toEqual({});
    expect(picWhileDualPayload(false, false, true)).toEqual({});
  });

  it('on create sends isPic only when set', () => {
    expect(picWhileDualPayload(true, true, undefined)).toEqual({ isPic: true });
    expect(picWhileDualPayload(true, false, undefined)).toEqual({});
  });

  it('on edit sends isPic only when changed', () => {
    expect(picWhileDualPayload(true, true, true)).toEqual({});
    expect(picWhileDualPayload(true, false, false)).toEqual({});
    expect(picWhileDualPayload(true, false, true)).toEqual({ isPic: false });
    expect(picWhileDualPayload(true, true, false)).toEqual({ isPic: true });
  });
});
