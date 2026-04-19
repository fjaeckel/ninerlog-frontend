import { useState } from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useAnnouncements } from '../../hooks/useAnnouncements';

const URL_REGEX = /(https?:\/\/[^\s<>'"]+)/g;

/** Splits text on URLs and renders them as clickable links */
function linkify(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:opacity-80">{part}</a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

const DISMISSED_KEY = 'ninerlog-dismissed-banners';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

const severityConfig = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
    dismiss: 'text-blue-400 hover:text-blue-600 dark:hover:text-blue-300',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
    dismiss: 'text-green-400 hover:text-green-600 dark:hover:text-green-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    dismiss: 'text-amber-400 hover:text-amber-600 dark:hover:text-amber-300',
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: <AlertOctagon className="w-4 h-4 text-red-500 shrink-0" />,
    dismiss: 'text-red-400 hover:text-red-600 dark:hover:text-red-300',
  },
};

export default function AnnouncementBanner() {
  const { data } = useAnnouncements();
  const [dismissed, setDismissedState] = useState<Set<string>>(getDismissed);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissedState(next);
    setDismissed(next);
  };

  if (!data) return null;

  // Combine announcements (admin) + hints (auto), filter dismissed
  const allItems = [
    ...data.announcements.map((a) => ({ ...a, source: 'announcement' as const })),
    ...data.hints.map((h) => ({ ...h, source: 'hint' as const })),
  ].filter((item) => !dismissed.has(item.id));

  if (allItems.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {allItems.map((item) => {
        const config = severityConfig[item.severity as keyof typeof severityConfig] || severityConfig.info;
        return (
          <div key={item.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${config.bg}`}>
            {config.icon}
            <span className={`flex-1 ${config.text}`}>{linkify(item.message)}</span>
            <button
              onClick={() => handleDismiss(item.id)}
              className={`shrink-0 p-0.5 rounded transition-colors ${config.dismiss}`}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
