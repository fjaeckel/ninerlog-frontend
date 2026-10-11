/** localStorage key holding licence ids whose "add issuing country" prompt was dismissed. */
export const COUNTRY_PROMPT_KEY = 'ninerlog-licence-country-prompt-dismissed';
/** localStorage key holding licence ids for which strict mode was already offered. */
export const STRICT_OFFER_KEY = 'ninerlog-strict-offer-shown';

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function addIds(key: string, ids: string[]): void {
  try {
    const next = Array.from(new Set([...readIds(key), ...ids]));
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // storage unavailable
  }
}

export const isCountryPromptDismissed = (licenseId: string) => readIds(COUNTRY_PROMPT_KEY).includes(licenseId);
export const dismissCountryPrompt = (licenseIds: string[]) => addIds(COUNTRY_PROMPT_KEY, licenseIds);

export const wasStrictOffered = (licenseId: string) => readIds(STRICT_OFFER_KEY).includes(licenseId);
export const markStrictOffered = (licenseId: string) => addIds(STRICT_OFFER_KEY, [licenseId]);
