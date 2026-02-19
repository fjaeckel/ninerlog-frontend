import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

/**
 * A small contextual help link that navigates to a specific help topic.
 * Usage: <HelpLink topic="flights" /> or <HelpLink topic="aircraft" label="Learn more" />
 */
export default function HelpLink({ topic, label = 'Help' }: { topic: string; label?: string }) {
  return (
    <Link
      to={`/help?topic=${topic}`}
      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
      title={`Open help: ${topic}`}
    >
      <HelpCircle className="w-3.5 h-3.5" />
      <span>{label}</span>
    </Link>
  );
}
