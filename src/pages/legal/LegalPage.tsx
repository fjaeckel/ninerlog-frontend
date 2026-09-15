import { Link, Navigate, NavLink, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { APP_NAME, LEGAL_DOCS } from '../../lib/config';
import { isLegalDocId, legalDocPath, type LegalDocId } from '../../lib/legal';
import { useLegalDocument } from '../../hooks/useLegalDocument';
import { useAuthStore } from '../../stores/authStore';
import { LogoMark } from '../../components/ui/Logo';
import { PageWrapper } from '../../components/ui/PageWrapper';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../lib/cn';

const docIcons: Record<LegalDocId, React.ReactNode> = {
  terms: <FileText className="w-4 h-4" aria-hidden="true" />,
  privacy: <ShieldCheck className="w-4 h-4" aria-hidden="true" />,
};

export default function LegalPage() {
  const { docId = '' } = useParams();
  const { t } = useTranslation('common');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const id = isLegalDocId(docId) && LEGAL_DOCS.includes(docId) ? docId : undefined;
  const doc = useLegalDocument(id);

  if (!id) return <Navigate to="/" replace />;

  const backTo = isAuthenticated ? '/dashboard' : '/login';
  // Documents that open with their own `# Title` carry the heading themselves.
  const hasOwnHeading = /^\s*#\s/.test(doc.data ?? '');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header
        className="sticky top-0 h-[calc(3.5rem+env(safe-area-inset-top))] surface-glass border-b z-30 flex items-center justify-between px-4 lg:px-6 pt-safe-top"
        role="banner"
      >
        <Link to={backTo} className="flex items-center gap-2.5 min-h-11" aria-label={APP_NAME}>
          <LogoMark size={32} decorative className="drop-shadow-sm" />
          <span className="text-lg font-bold tracking-tight text-gradient-brand">{APP_NAME}</span>
        </Link>
        <Link to={backTo} className="btn-ghost btn-sm text-slate-500 dark:text-slate-400">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t(isAuthenticated ? 'legal.backToApp' : 'legal.backToLogin')}
        </Link>
      </header>

      <main id="main-content" className="px-4 lg:px-8 pb-12">
        <PageWrapper maxWidth="content">
          {LEGAL_DOCS.length > 1 && (
            <nav className="flex flex-wrap gap-2 mb-4" aria-label={t('legal.navLabel')}>
              {LEGAL_DOCS.map((other) => (
                <NavLink
                  key={other}
                  to={legalDocPath(other)}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 min-h-11 px-3 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )
                  }
                >
                  {docIcons[other]}
                  {t(`legal.${other}`)}
                </NavLink>
              ))}
            </nav>
          )}

          {!hasOwnHeading && <h1 className="page-title mb-4">{t(`legal.${id}`)}</h1>}

          {doc.isPending ? (
            <div className="card space-y-3" aria-busy="true" aria-label={t('a11y.loadingContent')}>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : doc.isError ? (
            <ErrorState
              title={t('legal.unavailableTitle')}
              message={t('legal.unavailableMessage')}
              onRetry={() => void doc.refetch()}
            />
          ) : (
            <div className="card">
              <article className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-200 prose-h2:dark:border-slate-700 prose-h2:pb-2 prose-a:text-blue-600 prose-a:dark:text-blue-400 prose-table:text-sm prose-th:bg-slate-50 prose-th:dark:bg-slate-800 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => {
                      const external = /^https?:\/\//i.test(href ?? '');
                      return (
                        <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {doc.data}
                </Markdown>
              </article>
            </div>
          )}
        </PageWrapper>
      </main>
    </div>
  );
}
