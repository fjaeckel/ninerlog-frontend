import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { tourSteps } from './tourSteps';

interface TargetState {
  rect: DOMRect | null;
  /** Which `data-tour` key actually matched (e.g. 'more' on mobile). */
  key: string | null;
}

const SPOTLIGHT_PADDING = 8;
const CARD_WIDTH = 340;
const GAP = 14;
const DESKTOP_QUERY = '(min-width: 1024px)';

/** Find the first visible element matching any of the given `data-tour` keys. */
function resolveTarget(keys?: string[]): { el: HTMLElement; key: string } | null {
  if (!keys) return null;
  for (const key of keys) {
    const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`);
    for (const el of Array.from(candidates)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && el.getClientRects().length > 0) {
        return { el, key };
      }
    }
  }
  return null;
}

export function OnboardingTour() {
  const isOpen = useOnboardingStore((s) => s.isOpen);
  const complete = useOnboardingStore((s) => s.complete);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation('onboarding');

  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<TargetState>({ rect: null, key: null });
  const [cardHeight, setCardHeight] = useState(0);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
  );
  const cardRef = useRef<HTMLDivElement>(null);

  const total = tourSteps.length;
  const step = tourSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  // Reset to the first step every time the tour (re)opens. Uses the
  // adjust-state-during-render pattern rather than an effect.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setStepIndex(0);
  }

  // Track viewport breakpoint so we can switch between floating card (desktop)
  // and bottom-sheet card (mobile).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Recompute the spotlight position for the active step. Re-runs on resize and
  // scroll so the highlight stays glued to its target.
  const updateTarget = useCallback(() => {
    const match = resolveTarget(step?.targets);
    setTarget({ rect: match ? match.el.getBoundingClientRect() : null, key: match?.key ?? null });
  }, [step]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    // Defer the first measurement to the next frame so we never call setState
    // synchronously inside the effect body, and to catch late layout shifts.
    const raf = requestAnimationFrame(updateTarget);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isOpen, updateTarget]);

  // Measure the card so we can keep it fully on-screen on desktop.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setCardHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  const finish = useCallback(() => {
    if (user) complete(user.id);
    else useOnboardingStore.getState().close();
  }, [user, complete]);

  const next = useCallback(() => {
    if (isLast) finish();
    else setStepIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, finish, total]);

  const back = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);

  // Keyboard: Esc skips, arrows navigate, focus stays trapped inside the card.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
        return;
      }
      if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault();
        back();
        return;
      }
      if (e.key === 'Tab' && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [finish, next, back, isFirst]
  );

  // Move focus into the card on each step so keyboard + screen-reader users
  // follow along.
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => cardRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [isOpen, stepIndex]);

  const cardStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isDesktop || !target.rect) return undefined; // mobile sheet / centered
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = target.rect;
    const cardH = cardHeight || 260;
    // Prefer the side of the target with the most room (sidebar lives left, so
    // this resolves to "right" in the common case).
    let left = r.right + GAP;
    if (left + CARD_WIDTH > vw - GAP) left = r.left - GAP - CARD_WIDTH;
    if (left < GAP) left = Math.min(Math.max(GAP, r.left), vw - CARD_WIDTH - GAP);
    let top = r.top;
    if (top + cardH > vh - GAP) top = vh - cardH - GAP;
    if (top < GAP) top = GAP;
    return { top, left, width: CARD_WIDTH };
  }, [isDesktop, target, cardHeight]);

  if (!isOpen || !step) return null;

  const title = t(`tour.steps.${step.id}.title`, { name: user?.name?.split(' ')[0] ?? '' });
  const body = t(`tour.steps.${step.id}.body`);
  const showMoreHint = target.key === 'more';

  const spotlight = target.rect
    ? {
        top: target.rect.top - SPOTLIGHT_PADDING,
        left: target.rect.left - SPOTLIGHT_PADDING,
        width: target.rect.width + SPOTLIGHT_PADDING * 2,
        height: target.rect.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  const cardClassName = isDesktop
    ? 'absolute pointer-events-auto'
    : 'fixed left-3 right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] mx-auto max-w-md pointer-events-auto';

  return createPortal(
    <div
      className="fixed inset-0 z-[2000]"
      role="dialog"
      aria-modal="true"
      aria-label={t('tour.dialogLabel')}
      onKeyDown={onKeyDown}
    >
      {/* Click-blocking backdrop. When no target is highlighted it also provides
          the dimming; otherwise the spotlight's box-shadow does. */}
      <div
        className={spotlight ? 'absolute inset-0' : 'absolute inset-0 bg-slate-950/70'}
        aria-hidden="true"
      />

      {/* Spotlight cut-out around the active menu item. */}
      {spotlight && (
        <div
          className="absolute rounded-xl pointer-events-none transition-all duration-300 ease-out"
          style={{
            ...spotlight,
            boxShadow:
              '0 0 0 3px #fff, 0 0 0 6px rgba(59,130,246,0.7), 0 0 0 9999px rgba(2,6,23,0.7)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip / step card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        className={`${cardClassName} rounded-2xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-5 outline-none animate-fade-in`}
        style={cardStyle}
      >
        <button
          onClick={finish}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
          aria-label={t('tour.close')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {tourSteps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex
                    ? 'w-5 bg-blue-600 dark:bg-blue-400'
                    : 'w-1.5 bg-slate-200 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-auto tabular-nums">
            {t('tour.progress', { current: stepIndex + 1, total })}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          {step.icon && (
            <span className="shrink-0 w-9 h-9 rounded-lg gradient-brand text-white flex items-center justify-center shadow-sm">
              {step.icon}
            </span>
          )}
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug pt-1">
            {title}
          </h2>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{body}</p>

        {showMoreHint && (
          <p className="mt-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
            {t('tour.moreHint')}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-5">
          <button
            onClick={finish}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 min-h-[44px] px-1 transition-colors"
          >
            {t('tour.skip')}
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={back} className="btn-secondary btn-sm min-h-[44px]">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                {t('tour.back')}
              </button>
            )}
            <button onClick={next} className="btn-primary btn-sm min-h-[44px]">
              {isLast ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  {t('tour.finish')}
                </>
              ) : (
                <>
                  {t('tour.next')}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default OnboardingTour;
