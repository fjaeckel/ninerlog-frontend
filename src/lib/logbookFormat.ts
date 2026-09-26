import { looksLikeULLicence } from './ultralight';

/** Formats of `GET /exports/pdf`. */
export const PDF_FORMATS = ['easa', 'faa', 'sailplane', 'ultralight', 'summary'] as const;
export type PdfFormat = (typeof PDF_FORMATS)[number];

/** Formats printed one page per batch; the API ignores `layout` for them. */
export const SINGLE_LAYOUT_FORMATS: readonly PdfFormat[] = ['summary', 'sailplane', 'ultralight'];

/** Authorities that issue only ultralight licences. */
const UL_ONLY_AUTHORITIES = ['DULV', 'DAEC'];

/** Licence types classified as sailplane licences (SPL, LAPL(S), FAA glider). */
const SAILPLANE_TYPES = ['SPL', 'LAPL(S)', 'GLIDER'];

interface LicenceLike {
  licenseType?: string | null;
  regulatoryAuthority?: string | null;
  issuingAuthority?: string | null;
}

const upper = (s: string | null | undefined) => (s ?? '').trim().toUpperCase();

/** Printed logbook format the API picks for a licence's logbook when `format` is omitted. */
export function logbookFormatForLicence(licence: LicenceLike | null | undefined): PdfFormat {
  if (!licence) return 'easa';
  const type = upper(licence.licenseType);
  if (
    looksLikeULLicence(type) ||
    UL_ONLY_AUTHORITIES.includes(upper(licence.regulatoryAuthority)) ||
    UL_ONLY_AUTHORITIES.includes(upper(licence.issuingAuthority))
  ) {
    return 'ultralight';
  }
  if (SAILPLANE_TYPES.includes(type)) return 'sailplane';
  return 'easa';
}
