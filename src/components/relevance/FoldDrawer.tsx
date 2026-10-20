import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

interface FoldContextValue {
  register: (id: string, weight: number) => () => void;
  count: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  container: HTMLElement | null;
  setContainer: (el: HTMLElement | null) => void;
}

const FoldContext = createContext<FoldContextValue | null>(null);

/** Collects folded elements of one form or page for its `<FoldDrawer />`. */
export function FoldScope({ children }: { children: ReactNode }) {
  const [weights, setWeights] = useState<ReadonlyMap<string, number>>(new Map());
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const register = useCallback((id: string, weight: number) => {
    setWeights((prev) => new Map(prev).set(id, weight));
    return () =>
      setWeights((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
  }, []);

  const count = useMemo(() => [...weights.values()].reduce((a, b) => a + b, 0), [weights]);
  const value = useMemo(
    () => ({ register, count, open, setOpen, container, setContainer }),
    [register, count, open, container],
  );
  return <FoldContext.Provider value={value}>{children}</FoldContext.Provider>;
}

interface FoldDrawerProps {
  /** Disclosure label; defaults to "More (n)". Receives the folded count. */
  label?: (count: number) => string;
  /** Shows the "why" line and the link to What I fly. */
  explain?: boolean;
  className?: string;
  /** With children, the drawer is its own scope and renders after them. */
  children?: ReactNode;
}

/** "More (n)" disclosure rendering the scope's folded elements inline; renders nothing when none are folded. */
export function FoldDrawer({ children, ...props }: FoldDrawerProps) {
  if (children !== undefined) {
    return (
      <FoldScope>
        {children}
        <DrawerPanel {...props} />
      </FoldScope>
    );
  }
  return <DrawerPanel {...props} />;
}

function DrawerPanel({ label, explain = true, className }: Omit<FoldDrawerProps, 'children'>) {
  const { t } = useTranslation('relevance');
  const ctx = useContext(FoldContext);
  const panelId = useId();
  if (!ctx || ctx.count === 0) return null;
  const { count, open, setOpen, setContainer } = ctx;

  return (
    <div className={cn('mt-4', className)} data-testid="fold-drawer">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -mx-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        {label ? label(count) : t('fold.more', { count })}
      </button>
      {open && (
        <div id={panelId} className="mt-2 space-y-4">
          {explain && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('fold.explain')}{' '}
              <Link to="/profile" className="link">{t('fold.manage')}</Link>
            </p>
          )}
          <div ref={setContainer} className="space-y-4" />
        </div>
      )}
    </div>
  );
}

interface FoldedProps {
  children: ReactNode;
  /** Why the element is folded. */
  reason?: string;
  /** How many folded items the children hold; defaults to 1. */
  count?: number;
}

/** Moves its children into the nearest `<FoldDrawer />`; renders them in place when there is none. */
export function Folded({ children, reason, count = 1 }: FoldedProps) {
  const ctx = useContext(FoldContext);
  const id = useId();
  const register = ctx?.register;
  useEffect(() => register?.(id, count), [register, id, count]);

  if (!ctx) return <>{children}</>;
  if (!ctx.open || !ctx.container) return null;
  return createPortal(
    <div data-relevance-reason={reason} title={reason}>
      {children}
    </div>,
    ctx.container,
  );
}
