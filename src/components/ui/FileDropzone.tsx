import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

interface FileDropzoneProps {
  /** Same syntax as the `accept` attribute of `<input type="file">`, e.g. `.csv,.txt`. */
  accept?: string;
  disabled?: boolean;
  /** Called with the dropped or picked file once it matches `accept`. */
  onFileSelected?: (file: File) => void;
  /** Accepts several files; called once with every file that matches `accept`. */
  onFilesSelected?: (files: File[]) => void;
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
 * Returns true when `file` satisfies an `accept` string. Mirrors the
 * browser's own matching: extensions (`.csv`), exact MIME types (`text/csv`)
 * and wildcards (`text/*`).
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

/** Drop target wrapping a hidden `<input type="file">`; several files when `onFilesSelected` is set. */
export function FileDropzone({
  accept,
  disabled = false,
  onFileSelected,
  onFilesSelected,
  onFileRejected,
  buttonLabel,
  hint,
  className,
  children,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Nesting depth across descendant dragenter/dragleave pairs.
  const dragDepth = useRef(0);

  // Swallow near-miss drops anywhere on the page.
  useEffect(() => {
    const swallow = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragover', swallow);
    document.addEventListener('drop', swallow);
    return () => {
      document.removeEventListener('dragover', swallow);
      document.removeEventListener('drop', swallow);
    };
  }, []);

  const multiple = !!onFilesSelected;

  const handleFiles = useCallback(
    (list: FileList | null | undefined) => {
      const files = Array.from(list ?? []);
      if (files.length === 0) return;
      if (!onFilesSelected) {
        const file = files[0];
        if (matchesAccept(file, accept)) onFileSelected?.(file);
        else onFileRejected?.(file);
        return;
      }
      const accepted = files.filter((f) => matchesAccept(f, accept));
      files.filter((f) => !accepted.includes(f)).forEach((f) => onFileRejected?.(f));
      if (accepted.length > 0) onFilesSelected(accepted);
    },
    [accept, onFileSelected, onFilesSelected, onFileRejected],
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
    // preventDefault enables the drop event.
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
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset so re-picking the same file fires `change`.
    e.target.value = '';
  };

  // Clicking anywhere in the zone opens the picker, except on controls.
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
        multiple={multiple}
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
