/** Authorities whose licences carry German ultralight recency (LuftPersV §45). */
export const GERMAN_UL_AUTHORITIES = ['LBA', 'DULV', 'DAeC'] as const;

/** Whether the authority is one of the German UL authorities (case-insensitive). */
export function isGermanULAuthority(authority: string | null | undefined): boolean {
  const a = (authority ?? '').trim().toUpperCase();
  return GERMAN_UL_AUTHORITIES.some((g) => g.toUpperCase() === a);
}

/** Whether a free-text licence type names an ultralight licence. */
export function looksLikeULLicence(licenseType: string | null | undefined): boolean {
  const t = (licenseType ?? '').trim().toUpperCase();
  return t === 'UL' || t.startsWith('UL ') || t.startsWith('UL-') || t.includes('ULTRALIGHT') || t.includes('ULTRALEICHT');
}
