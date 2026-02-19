import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HelpCircle, Plane, Award, FileText, PlaneTakeoff, Upload, Shield, BarChart3, User, ShieldCheck, BookOpen } from 'lucide-react';
import {
  gettingStarted, aircraft, licenses, credentials,
  flights, importExport, currency, reports, profile, admin,
} from './content';

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
  const [active, setActive] = useState('getting-started');
  const activeSection = sections.find((s) => s.id === active) || sections[0];

  return (
    <div className="mx-auto max-w-[1100px] py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-blue-600" />
          <h1 className="page-title">Help Base</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Learn how to use PilotLog — guides for every feature.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar TOC — desktop */}
        <nav className="hidden lg:block w-56 shrink-0" aria-label="Help topics">
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
          {/* Mobile topic selector */}
          <div className="lg:hidden mb-4">
            <select value={active} onChange={(e) => setActive(e.target.value)} className="input w-full" aria-label="Select help topic">
              {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div className="card">
            <article className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-200 prose-h2:dark:border-slate-700 prose-h2:pb-2 prose-table:text-sm prose-th:bg-slate-50 prose-th:dark:bg-slate-800 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-blockquote:border-blue-300 prose-blockquote:dark:border-blue-700 prose-blockquote:bg-blue-50/50 prose-blockquote:dark:bg-blue-900/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
              <Markdown remarkPlugins={[remarkGfm]}>{activeSection.content}</Markdown>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
