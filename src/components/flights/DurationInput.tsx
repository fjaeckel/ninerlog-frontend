import { useState, useEffect, useCallback } from 'react';
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
}

/**
 * Smart duration input that accepts multiple formats:
 * - "1:30" or "1h30m" → 90 minutes
 * - "1.5" → 90 minutes (decimal hours)
 * - "90" → 90 minutes
 *
 * Shows the parsed result in the user's preferred format as helper text.
 */
export function DurationInput({
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

  // Sync display when value changes externally (and input is not focused)
  useEffect(() => {
    if (!isFocused) {
      if (value === 0) {
        setInputText('');
      } else {
        setInputText(formatDuration(value, displayFormat));
      }
    }
  }, [value, displayFormat, isFocused]);

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
      value={inputText}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputText(e.target.value)}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      className={`input ${className ?? ''}`}
    />
  );
}
