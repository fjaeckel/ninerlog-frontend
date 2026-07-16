import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import {
  SEARCH_TAGS,
  OPERATORS_BY_TYPE,
  suggestTags,
  type SearchTag,
  type SearchTagType,
} from '../../lib/flightSearchTags';

interface FlightSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Parse error returned by the API for the current query, if any. */
  error?: string | null;
}

interface WordAtCursor {
  word: string;
  start: number;
  end: number;
}

// Extract the word the cursor is in. Words break on whitespace and parens;
// a word containing an operator is a tag value, not a tag name.
function wordAtCursor(value: string, cursor: number): WordAtCursor {
  let start = cursor;
  while (start > 0 && !' \t\n()'.includes(value[start - 1])) start--;
  let end = cursor;
  while (end < value.length && !' \t\n()'.includes(value[end])) end++;
  return { word: value.slice(start, cursor), start, end };
}

const TYPE_ORDER: SearchTagType[] = ['text', 'date', 'duration', 'int', 'number', 'bool', 'clock'];

export default function FlightSearchBar({ value, onChange, error }: FlightSearchBarProps) {
  const { t } = useTranslation(['flights', 'common']);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const { word, start, end } = useMemo(() => wordAtCursor(value, cursor), [value, cursor]);
  // A leading '-' is the negation prefix; anything containing an operator or
  // quote is a tag value, where suggestions would be wrong.
  const negated = word.startsWith('-');
  const bareWord = negated ? word.slice(1) : word;
  const isKeyword = /^(and|or|not)$/i.test(bareWord);
  const isTagPosition = bareWord.length > 0 && !isKeyword && !/[:=<>!"']/.test(bareWord);
  const suggestions = useMemo(
    () => (dropdownOpen && isTagPosition ? suggestTags(bareWord) : []),
    [dropdownOpen, isTagPosition, bareWord]
  );

  const syncCursor = () => {
    setCursor(inputRef.current?.selectionStart ?? value.length);
  };

  const applyTag = (tag: SearchTag) => {
    const inserted = (negated ? '-' : '') + tag.name + ':';
    const next = value.slice(0, start) + inserted + value.slice(end);
    onChange(next);
    setDropdownOpen(false);
    requestAnimationFrame(() => {
      const pos = start + inserted.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
      setCursor(pos);
    });
  };

  const insertTagFromHelp = (tag: SearchTag) => {
    const needsSpace = value.length > 0 && !value.endsWith(' ');
    const next = value + (needsSpace ? ' ' : '') + tag.name + ':';
    onChange(next);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.length, next.length);
      setCursor(next.length);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyTag(suggestions[Math.min(highlighted, suggestions.length - 1)]);
        return;
      }
    }
    if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const tagsByType = useMemo(() => {
    const groups = new Map<SearchTagType, SearchTag[]>();
    for (const type of TYPE_ORDER) groups.set(type, []);
    for (const tag of SEARCH_TAGS) groups.get(tag.type)?.push(tag);
    return groups;
  }, []);

  return (
    <div className="mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setCursor(e.target.selectionStart ?? e.target.value.length);
            setDropdownOpen(true);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={syncCursor}
          onClick={syncCursor}
          onBlur={() => {
            // Delay so mousedown on a suggestion can register first
            setTimeout(() => setDropdownOpen(false), 150);
          }}
          placeholder={t('flights:searchPlaceholder')}
          className={`input pl-10 pr-20 font-mono text-sm ${error ? 'border-red-400 dark:border-red-500' : ''}`}
          aria-label={t('flights:searchPlaceholder')}
          aria-expanded={suggestions.length > 0}
          aria-autocomplete="list"
          role="combobox"
          aria-controls="flight-search-suggestions"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
          {value && (
            <button
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[40px] min-h-[44px] flex items-center justify-center"
              aria-label={t('flights:clearSearch')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowHelp((s) => !s)}
            className={`min-w-[40px] min-h-[44px] flex items-center justify-center transition-colors ${
              showHelp ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            aria-label={t('flights:searchHelpToggle')}
            aria-expanded={showHelp}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Tag autocomplete dropdown */}
        {suggestions.length > 0 && (
          <ul
            id="flight-search-suggestions"
            role="listbox"
            className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {suggestions.map((tag, i) => (
              <li key={tag.name} role="option" aria-selected={i === highlighted}>
                <button
                  className={`w-full px-3 py-2 text-left flex items-baseline gap-2 ${
                    i === highlighted ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyTag(tag);
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-100">{tag.name}:</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
                    {t(`flights:searchTags.${tag.name}`)}
                  </span>
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">{tag.example}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Query parse error from the API */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Syntax help + tag browser */}
      {showHelp && (
        <div className="card mt-2 p-4 text-sm">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('flights:searchHelpTitle')}</h3>
          <ul className="space-y-1 text-slate-600 dark:text-slate-300 mb-4">
            <li>
              <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 rounded px-1">EDDF checkride</code>{' '}
              — {t('flights:searchHelpFreeText')}
            </li>
            <li>
              <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 rounded px-1">night&gt;0 AND (from:EDDF OR to:EDDF)</code>{' '}
              — {t('flights:searchHelpBoolean')}
            </li>
            <li>
              <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 rounded px-1">NOT remarks:cancelled</code>{' '}
              — {t('flights:searchHelpNegation')}
            </li>
            <li>
              <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 rounded px-1">crew:&quot;John Doe&quot; reg:D-E*</code>{' '}
              — {t('flights:searchHelpQuotes')}
            </li>
            <li>
              <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 rounded px-1">totalTime&gt;1:30 date:2026-05</code>{' '}
              — {t('flights:searchHelpValues')}
            </li>
          </ul>
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('flights:searchTagsTitle')}</h4>
          <div className="space-y-3">
            {TYPE_ORDER.map((type) => (
              <div key={type}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t(`flights:searchTagType.${type}`)}
                  </span>
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{OPERATORS_BY_TYPE[type]}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(tagsByType.get(type) ?? []).map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => insertTagFromHelp(tag)}
                      title={t(`flights:searchTags.${tag.name}`)}
                      className="font-mono text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
