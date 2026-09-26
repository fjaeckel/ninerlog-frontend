import { useState, type Ref } from 'react';
import { formatTimeOfDay, parseTimeOfDay, type ClockFormat } from '../../lib/timeOfDay';

interface TimeOfDayInputProps {
  id?: string;
  name?: string;
  /** Canonical `HH:MM`, `''`, or unparseable text the user left behind. */
  value: string;
  /** Called on blur and Enter with canonical `HH:MM`, `''`, or the raw text when it does not parse. */
  onChange: (value: string) => void;
  onBlur?: () => void;
  clockFormat: ClockFormat;
  className?: string;
  title?: string;
  disabled?: boolean;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Text input for a time of day, rendered in the given clock format
 * independent of the browser locale.
 */
export function TimeOfDayInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  clockFormat,
  className,
  title,
  disabled,
  invalid,
  ref,
}: TimeOfDayInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? formatTimeOfDay(value, clockFormat);

  const commit = () => {
    if (draft === null) return;
    const parsed = parseTimeOfDay(draft);
    onChange(parsed ?? draft.trim());
    setDraft(null);
  };

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type="text"
      inputMode={clockFormat === '24h' ? 'numeric' : 'text'}
      autoComplete="off"
      spellCheck={false}
      placeholder={clockFormat === '24h' ? 'HH:MM' : 'h:mm AM'}
      maxLength={10}
      value={display}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        commit();
        onBlur?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
      className={className}
      title={title}
      disabled={disabled}
      aria-invalid={invalid || undefined}
    />
  );
}
