import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAirport, useAirportSearch, type Airport } from '../../hooks/useMaps';
import { isLocalIdent } from '../../lib/airport';
import { useDebounced } from '../../hooks/useDebounced';
import { cn } from '../../lib/cn';

const SEARCH_DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 8;

interface AirportInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  maxLength?: number;
  className?: string;
}

/**
 * Location input with airport suggestions; picking one stores its identifier,
 * free text stays allowed. An OurAirports local identifier is shown by its
 * airport name.
 */
export function AirportInput({ id, value, onChange, onBlur, placeholder, invalid, maxLength = 100, className }: AirportInputProps) {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState<Airport | null>(null);
  const [editing, setEditing] = useState(false);
  const debounced = useDebounced(query.trim(), SEARCH_DEBOUNCE_MS);
  const { data } = useAirportSearch(debounced);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = query.trim().length >= 2 ? (data ?? []).slice(0, MAX_SUGGESTIONS) : [];
  const open = suggestions.length > 0;

  const close = () => {
    setQuery('');
    setActive(-1);
  };

  const pick = (airport: Airport) => {
    onChange(airport.icao);
    setPicked(airport);
    setEditing(false);
    close();
  };

  const localIdent = isLocalIdent(value);
  const pickedMatch = picked && picked.icao === value ? picked : null;
  const { data: stored } = useAirport(value, localIdent && !pickedMatch);
  const localName = localIdent ? (pickedMatch?.name ?? stored?.name ?? null) : null;
  const shown = !editing && localName ? localName : value;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };

  const pickedName = pickedMatch && !localIdent ? pickedMatch.name : null;

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={shown}
        onChange={(e) => {
          setEditing(true);
          onChange(e.target.value);
          setQuery(e.target.value);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          close();
          setEditing(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        className={cn('input', invalid && 'input-error')}
      />
      {pickedName && <p className="form-helper truncate">{pickedName}</p>}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('airportInput.suggestions')}
          className="absolute z-20 top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {suggestions.map((a, i) => (
            <li
              key={a.icao}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                pick(a);
                inputRef.current?.focus();
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200',
                i === active && 'bg-blue-50 dark:bg-blue-900/20'
              )}
            >
              <span className="w-16 shrink-0 font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {isLocalIdent(a.icao) ? '' : a.icao}
              </span>
              <span className="min-w-0 flex-1 line-clamp-2">{a.name}</span>
              {a.localCode && (
                <span className="badge-neutral shrink-0 font-mono">{a.localCode}</span>
              )}
              {a.country && <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{a.country}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
