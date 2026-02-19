import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HelpCircle, Plane, Award, FileText, PlaneTakeoff, Upload, Shield, BarChart3, User, ShieldCheck, BookOpen, Search, X } from 'lucide-react';
import {
  gettingStarted, aircraft, licenses, credentials,
  flights, importExport, currency, reports, profile, admin,
} from './content';
import { APP_NAME } from '../../lib/config';

const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: <BookOpen className="w-4 h-4" />, content: gettingStarted },
  { id: 'aircraft', label: 'Aircraft', icon: <PlaneTakeoff className="w-4 h-4" />, content: aircraft },
  { id: 'licenses', label: 'Licenses & Ratings', icon: <Award className="w-4 h-4" />, content: licenses },
  { id: 'credentials', label: 'Credentials', icon: <FileText className="w-4 h-4" />, content: credentials },
  { id: 'flights', label: 'Logging Flights', icon: <Plane className="w-4 h-4" />, content: flights },
  { id: 'import-export', label: 'Import & Export', icon: <Upload className="w-4 h-4" />, content: importExport },
  { id: 'currency', label: 'Currency & Recency', icon: <Shield className="w-4 h-4" />, content: currency },
  { id: 'reports', label: 'Reports & Maps', icon: <BarChart3 className="w-4 h-4" />, content: reports },
  { id: 'profile', label: 'Profile & Settings', icon: <User className="w-4 h-4" />, content: profile },
  { id: 'admin', label: 'Admin Console', icon: <ShieldCheck className="w-4 h-4" />, content: admin },
];

export default function HelpPage() {
  const [searchParams] = useSearchParams();
  const topicFromUrl = searchParams.get('topic');

  const [active, setActive] = useState(() => {
    const match = sections.find((s) => s.id === topicFromUrl);
    return match ? match.id : 'getting-started';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sync topic from URL when navigating via HelpLink
  useEffect(() => {
    if (topicFromUrl && sections.some((s) => s.id === topicFromUrl)) {
      setActive(topicFromUrl);
      setSearchQuery('');
    }
  }, [topicFromUrl]);

  const activeSection = sections.find((s) => s.id === active) || sections[0];

  // Search: find sections matching the query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return sections.filter((s) =>
      s.label.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Highlight matching text in search results (show snippet around match)
  const getSnippet = (content: string, query: string): string => {
    const lower = content.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return '';
    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + query.length + 60);
    let snippet = content.slice(start, end).replace(/[#*|_>\-]/g, '').trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet += '...';
    return snippet;
  };

  return (
    <div className="mx-auto max-w-[1100px] py-6 print:max-w-none print:py-0">
      {/* Header — hidden on print */}
      <div className="mb-6 print:hidden">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-blue-600" />
          <h1 className="page-title">Help Base</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Learn how to use {APP_NAME} — guides for every feature.</p>
      </div>

      {/* Search bar — hidden on print */}
      <div className="mb-4 print:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics..."
            className="input pl-10 pr-10 w-full"
            aria-label="Search help topics"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {searchResults !== null ? (
        <div className="space-y-3 print:hidden">
          <p className="text-sm text-slate-500">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
          {searchResults.length === 0 && (
            <div className="card text-center py-8 text-slate-400">No help topics match your search.</div>
          )}
          {searchResults.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActive(s.id); setSearchQuery(''); }}
              className="card w-full text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                {s.icon}
                <span className="font-medium text-slate-800 dark:text-slate-200">{s.label}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{getSnippet(s.content, searchQuery)}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Sidebar TOC — desktop only, hidden on print */}
          <nav className="hidden lg:block w-56 shrink-0 print:hidden" aria-label="Help topics">
            <div className="sticky top-20 space-y-1">
              {sections.map((s) => (
                <button key={s.id} onClick={() => setActive(s.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                    active === s.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {/* Mobile topic selector — hidden on print */}
            <div className="lg:hidden mb-4 print:hidden">
              <select value={active} onChange={(e) => setActive(e.target.value)} className="input w-full" aria-label="Select help topic">
                {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            <div className="card print:shadow-none print:border-none print:p-0">
              <article className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-200 prose-h2:dark:border-slate-700 prose-h2:pb-2 prose-table:text-sm prose-th:bg-slate-50 prose-th:dark:bg-slate-800 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-blockquote:border-blue-300 prose-blockquote:dark:border-blue-700 prose-blockquote:bg-blue-50/50 prose-blockquote:dark:bg-blue-900/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg print:prose-base">
                <Markdown remarkPlugins={[remarkGfm]}>{activeSection.content}</Markdown>
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
