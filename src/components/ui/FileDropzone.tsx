import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

interface FileDropzoneProps {
  /** Same syntax as the `accept` attribute of `<input type="file">`, e.g. `.csv,.txt`. */
  accept?: string;
  disabled?: boolean;
  /** Called with the dropped or picked file once it matches `accept`. */
  onFileSelected: (file: File) => void;
  /** Called instead when the file does not match `accept` — the caller owns the message. */
  onFileRejected?: (file: File) => void;
  /** Label of the built-in trigger button — the keyboard path into the file picker. */
  buttonLabel: string;
  /** Short line under the button explaining that dropping works too. */
  hint: string;
  className?: string;
  /** Icon, heading and description rendered above the trigger button. */
  children?: React.ReactNode;
}

/**
 * Returns true when `file` satisfies an `accept` string. Mirrors the browser's own
 * matching: extensions (`.csv`), exact MIME types (`text/csv`) and wildcards (`text/*`).
 * A drop bypasses the file picker's filtering, so we have to redo it here.
 */
function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/** Drop target wrapping a hidden `<input type="file">`, for single-file uploads. */
export function FileDropzone({
  accept,
  disabled = false,
  onFileSelected,
  onFileRejected,
  buttonLabel,
  hint,
  className,
  children,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave also fire for descendants, so track nesting depth instead
  // of clearing the highlight on the first dragleave.
  const dragDepth = useRef(0);

  // While a dropzone is on screen, a near-miss drop should do nothing rather than
  // make the browser navigate away from the app to render the dropped file.
  useEffect(() => {
    const swallow = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragover', swallow);
    document.addEventListener('drop', swallow);
    return () => {
      document.removeEventListener('dragover', swallow);
      document.removeEventListener('drop', swallow);
    };
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (matchesAccept(file, accept)) {
        onFileSelected(file);
      } else {
        onFileRejected?.(file);
      }
    },
    [accept, onFileSelected, onFileRejected],
  );

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const handleDragEnter = (e: React.DragEvent) => {
    // Ignore drags that carry no file (text selections, in-page element drags).
    if (disabled || !hasFiles(e)) return;
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled || !hasFiles(e)) return;
    // Required for the drop event to fire at all.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    // Single-file flow, same as the underlying input.
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so re-picking the same file after an error still fires `change`.
    e.target.value = '';
  };

  // Pointer shortcut: clicking anywhere in the zone opens the picker, unless the
  // click landed on a control that handles it itself.
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label')) return;
    openPicker();
  };

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-dragging={isDragging || undefined}
      className={cn(
        'border-2 border-dashed border-slate-300 dark:border-slate-600 transition-colors',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        isDragging && 'border-blue-500 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-900/20',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />
      {children}
      <button onClick={openPicker} disabled={disabled} className="btn-primary">
        {buttonLabel}
      </button>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">{hint}</p>
    </div>
  );
}
