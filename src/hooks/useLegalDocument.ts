import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { legalDocUrl, type LegalDocId } from '../lib/legal';

async function fetchMarkdown(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { Accept: 'text/markdown, text/plain' } });
  if (!res.ok) return null;
  // SPA fallback answers a missing file with index.html.
  if ((res.headers.get('content-type') ?? '').includes('text/html')) return null;
  return res.text();
}

/**
 * Loads a legal document's Markdown: the `lang` variant first, then the default file.
 * Rejects when neither exists.
 */
export async function fetchLegalDocument(id: LegalDocId, lang: string): Promise<string> {
  const candidates = lang ? [legalDocUrl(id, lang), legalDocUrl(id)] : [legalDocUrl(id)];
  for (const url of candidates) {
    const text = await fetchMarkdown(url);
    if (text !== null) return text;
  }
  throw new Error(`Legal document "${id}" is not available`);
}

/** The Markdown of a published legal document in the current UI language. */
export const useLegalDocument = (id: LegalDocId | undefined) => {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? '').split('-')[0];
  return useQuery({
    queryKey: ['legal', id, lang],
    queryFn: () => fetchLegalDocument(id!, lang),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
