// Helpers for deciding *when* a flights advanced-search query is worth sending
// to the API. The query language itself is described by SEARCH_TAGS in
// ./flightSearchTags.ts and parsed server-side in
// ninerlog-api internal/flightsearch/parse.go.

/**
 * How long to wait after the last keystroke before issuing a search.
 *
 * Search is the most expensive read in the app — a free-text query compiles to
 * leading-wildcard scans across every text field plus a crew subquery — and it
 * has its own server-side rate limit. 300ms was short enough that an ordinary
 * typing hesitation counted as a finished query, so refining one search cost
 * several requests.
 */
export const SEARCH_DEBOUNCE_MS = 500;

/** Trailing tokens that mean the user is still mid-expression. */
const DANGLING_OPERATOR = /(:|>=|<=|>|<|=|&&|\|\||\()\s*$/;
const DANGLING_KEYWORD = /(^|\s)(AND|OR|NOT)\s*$/i;

/**
 * Whether a search box's contents are worth spending a request on.
 *
 * The flights search is a structured language, not a substring match, so a
 * half-typed query is not a coarser search — it is a guaranteed-useless one.
 * `from:` cannot match anything, and `f` matches everything. Sending those
 * burns rate-limit budget that the user's *finished* query then gets refused
 * for.
 *
 * An empty query always passes: clearing the box has to reach the URL so the
 * unfiltered list comes back.
 */
export function isSearchWorthSending(query: string): boolean {
  const trimmed = query.trim();

  // Clearing the search must always propagate.
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
