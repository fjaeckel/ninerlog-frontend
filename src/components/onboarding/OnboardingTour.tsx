import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { usePilotProfile, useUpdatePilotProfile, useDisciplines } from '../../hooks/usePilotProfile';
import { stepsFor, tourVariant } from './tourSteps';
import { DisciplinesStep } from './DisciplinesStep';
import { buildUpdate, fromLogbook, initialPicks, type Picks } from './disciplinePicks';

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

  const { data: profile } = usePilotProfile();
  const disciplines = useDisciplines();
  const updateProfile = useUpdatePilotProfile();
  const [picked, setPicked] = useState<Picks | null>(null);
  const [saveError, setSaveError] = useState('');
  const initial = useMemo(() => initialPicks(profile), [profile]);
  const logbook = useMemo(() => fromLogbook(profile), [profile]);
  const picks = picked ?? initial;

  const [tourSteps, setTourSteps] = useState(() => stepsFor(profile));
  const total = tourSteps.length;
  const step = tourSteps[stepIndex];
  const isDisciplines = step?.id === 'disciplines';
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  // Reset to the first step every time the tour (re)opens; state adjusted
  // during render.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setStepIndex(0);
      setPicked(null);
      setSaveError('');
      setTourSteps(stepsFor(profile));
    }
  }
  // Steps recomputed once when the profile first arrives on the first step.
  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    if (prevProfile === undefined && stepIndex === 0 && picked === null) setTourSteps(stepsFor(profile));
  }

  // Viewport breakpoint: floating card (desktop) vs bottom sheet (mobile).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Recompute the spotlight position for the active step; re-runs on resize
  // and scroll.
  const updateTarget = useCallback(() => {
    const match = resolveTarget(step?.targets);
    setTarget({ rect: match ? match.el.getBoundingClientRect() : null, key: match?.key ?? null });
  }, [step]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    // First measurement deferred to the next frame.
    const raf = requestAnimationFrame(updateTarget);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isOpen, updateTarget]);

  // Card measurement, for on-screen placement on desktop.
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

  const advance = useCallback(() => {
    if (isLast) finish();
    else setStepIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, finish, total]);

  const next = useCallback(async () => {
    if (!isDisciplines) return advance();
    const body = buildUpdate(profile, picks);
    if (!body) return advance();
    setSaveError('');
    try {
      await updateProfile.mutateAsync(body);
      advance();
    } catch {
      setSaveError(t('tour.disciplines.saveFailed'));
    }
  }, [isDisciplines, advance, profile, picks, updateProfile, t]);

  const skipStep = useCallback(() => {
    setSaveError('');
    advance();
  }, [advance]);

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
        void next();
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

  // Move focus into the card on each step.
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
    // Prefer the side of the target with the most room.
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
  const variant = tourVariant(disciplines);
  const body = step.variants?.includes(variant)
    ? t(`tour.steps.${step.id}.variants.${variant}`)
    : t(`tour.steps.${step.id}.body`, { name: user?.name?.split(' ')[0] ?? '' });
  const showMoreHint = target.key === 'more';

  const spotlight = target.rect
    ? {
        top: target.rect.top - SPOTLIGHT_PADDING,
        left: target.rect.left - SPOTLIGHT_PADDING,
        width: target.rect.width + SPOTLIGHT_PADDING * 2,
        height: target.rect.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  // Card placement:
  //  • no target (welcome/finish)  → centered on screen
  //  • desktop + target            → floating beside the spotlight (cardStyle)
  //  • mobile + target             → docked as a bottom sheet above the nav bar
  let cardClassName: string;
  if (!target.rect) {
    cardClassName =
      'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto pointer-events-auto';
  } else if (isDesktop) {
    cardClassName = 'absolute pointer-events-auto';
  } else {
    cardClassName =
      'fixed left-3 right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] mx-auto max-w-md pointer-events-auto';
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2000]"
      role="dialog"
      aria-modal="true"
      aria-label={t('tour.dialogLabel')}
      onKeyDown={onKeyDown}
    >
      {/* Click-blocking backdrop; dims when no target is highlighted */}
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
        <div className="flex items-center gap-2 mb-3 pr-7">
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

        {isDisciplines && (
          <DisciplinesStep
            picks={picks}
            initial={initial}
            logbook={logbook}
            onChange={(p) => {
              setSaveError('');
              setPicked(p);
            }}
            error={saveError}
          />
        )}

        {showMoreHint && (
          <p className="mt-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
            {t('tour.moreHint')}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-5">
          <button
            onClick={isDisciplines ? skipStep : finish}
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
            <button
              onClick={() => void next()}
              disabled={isDisciplines && updateProfile.isPending}
              className="btn-primary btn-sm min-h-[44px]"
            >
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
