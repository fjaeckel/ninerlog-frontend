// Helpers for deciding *when* a flights advanced-search query is worth sending
// to the API. The query language itself is described by SEARCH_TAGS in
// ./flightSearchTags.ts and parsed server-side in
// ninerlog-api internal/flightsearch/parse.go.

/** How long to wait after the last keystroke before issuing a search. */
export const SEARCH_DEBOUNCE_MS = 500;

/** Trailing tokens that mean the user is still mid-expression. */
const DANGLING_OPERATOR = /(:|>=|<=|>|<|=|&&|\|\||\()\s*$/;
const DANGLING_KEYWORD = /(^|\s)(AND|OR|NOT)\s*$/i;

/**
 * Whether a search box's contents are worth spending a request on.
 * An empty query always passes.
 */
export function isSearchWorthSending(query: string): boolean {
  const trimmed = query.trim();

  if (trimmed === '') return true;

  // A single character constrains nothing.
  if (trimmed.length < 2) return false;

  // Mid-token: "from:", "night>", "totalTime >=", "EDDF AND".
  if (DANGLING_OPERATOR.test(trimmed)) return false;
  if (DANGLING_KEYWORD.test(trimmed)) return false;

  // Mid-group or mid-quote: "(from:EDDF OR", 'remarks:"check'.
  if (countOf(trimmed, '(') > countOf(trimmed, ')')) return false;
  if (countOf(trimmed, '"') % 2 !== 0) return false;

  return true;
}

function countOf(haystack: string, char: string): number {
  let n = 0;
  for (const c of haystack) if (c === char) n++;
  return n;
}
