/** Operator-published legal documents, in display order. */
export const LEGAL_DOC_IDS = ['terms', 'privacy'] as const;

export type LegalDocId = (typeof LEGAL_DOC_IDS)[number];

export function isLegalDocId(value: string): value is LegalDocId {
  return (LEGAL_DOC_IDS as readonly string[]).includes(value);
}

/** Parses the comma-separated `VITE_LEGAL_DOCS` value into known ids, in display order. */
export function parseLegalDocs(raw: string): LegalDocId[] {
  const wanted = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  return LEGAL_DOC_IDS.filter((id) => wanted.has(id));
}

/** Route of a legal document's page. */
export function legalDocPath(id: LegalDocId): string {
  return `/legal/${id}`;
}

/** URL of the Markdown source, optionally the `lang` variant. */
export function legalDocUrl(id: LegalDocId, lang?: string): string {
  return lang ? `/legal/${id}.${lang}.md` : `/legal/${id}.md`;
}
