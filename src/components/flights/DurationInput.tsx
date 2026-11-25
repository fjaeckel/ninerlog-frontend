import { useState, useCallback, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { parseFlightTimeEntry, formatFlightTimeEntry } from '../../lib/flightTimeEntry';
import type { DecimalSeparator } from '../../lib/duration';
import { parseDuration, formatDuration, type TimeDisplayFormat } from '@/lib/duration';

interface DurationInputProps {
  /** Current value in minutes */
  value: number;
  /** Called when the value changes (in minutes) */
  onChange: (minutes: number) => void;
  /** Display format for the helper text */
  displayFormat?: TimeDisplayFormat;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Minimum value in minutes (default 0) */
  min?: number;
  /** Additional CSS class */
  className?: string;
  /** Input id */
  id?: string;
  entryFormat?: TimeDisplayFormat;
  decimalSeparator?: DecimalSeparator;
  onEmpty?: () => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  invalid?: boolean;

}

/**
 * Smart duration input that accepts multiple formats:
 * - "1:30" or "1h30m" → 90 minutes
 * - "1.5" → 90 minutes (decimal hours)
 * - "90" → 90 minutes
 *
 * Shows the parsed result in the user's preferred format as helper text.
 */
function LegacyDurationInput({
  value,
  onChange,
  displayFormat = 'hm',
  placeholder = '0:00',
  disabled = false,
  min = 0,
  className,
  id,
}: DurationInputProps) {
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Display formatted value when not focused; preserve user input when focused
  const displayText = isFocused
    ? inputText
    : (value === 0 ? '' : formatDuration(value, displayFormat));

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (inputText.trim() === '') {
      onChange(0);
      return;
    }
    const parsed = parseDuration(inputText);
    if (parsed !== null && parsed >= min) {
      onChange(parsed);
      setInputText(parsed === 0 ? '' : formatDuration(parsed, displayFormat));
    } else {
      // Revert to current value
      setInputText(value === 0 ? '' : formatDuration(value, displayFormat));
    }
  }, [inputText, onChange, value, displayFormat, min]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  return (
    <input
      id={id}
      type="text"
      value={displayText}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputText(e.target.value)}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      className={`input ${className ?? ''}`}
    />
  );
}


interface FlightDurationInputProps extends Omit<DurationInputProps, 'value'> {
  value: number | undefined;
}

export function DurationInput({ inputRef, ...props }: FlightDurationInputProps) {
  if (props.entryFormat === undefined) return <LegacyDurationInput {...props} value={props.value ?? 0} />;
  if (props.entryFormat === 'hm') return (
    <input ref={inputRef} id={props.id} type="number" min={props.min ?? 0} step="1"
      value={props.value ?? ''} disabled={props.disabled} className={props.className ?? 'input'}
      placeholder={props.placeholder} aria-invalid={props.invalid}
      onChange={(e) => {
        if (e.target.value === '') { if (props.onEmpty) props.onEmpty(); else props.onChange(0); }
        else props.onChange(Number(e.target.value));
      }} onBlur={props.onBlur} />
  );
  return <DecimalDurationInput {...props} inputRef={inputRef} />;
}

function DecimalDurationInput({ inputRef, ...props }: FlightDurationInputProps) {
  const { t } = useTranslation('flights');
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const invalid = props.value !== undefined && (!Number.isFinite(props.value) || props.value < (props.min ?? 0));
  const formatted = formatFlightTimeEntry(props.value, 'decimal', props.decimalSeparator ?? 'dot');
  const errorId = `${props.id}-duration-error`;
  return <>
    <input ref={inputRef} id={props.id} type="text" inputMode="decimal"
      value={focused || invalid ? text : formatted} disabled={props.disabled}
      placeholder={props.placeholder ?? '0.0'}
      className={props.className ?? 'input'} aria-invalid={props.invalid || invalid}
      aria-describedby={invalid ? errorId : undefined}
      onFocus={() => { if (!invalid) setText(formatted); setFocused(true); }}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next.trim() === '') {
          if (props.onEmpty) props.onEmpty(); else props.onChange(0);
          return;
        }
        const minutes = parseFlightTimeEntry(next, 'decimal');
        const bad = minutes === null || minutes < (props.min ?? 0);
        props.onChange(bad ? Number.NaN : minutes);
      }}
      onBlur={() => {
        setFocused(false);
        props.onBlur?.();
      }} />
    {invalid && <p id={errorId} role="alert" className="form-error">{t('durationEntry.invalid')}</p>}
  </>;
}
