import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Plane,
  PlaneTakeoff,
  Award,
  FileText,
  Plus,
  Shield,
  Compass,
} from 'lucide-react';
import type { Disciplines, PilotProfile } from '../../hooks/usePilotProfile';

export interface TourStep {
  /** Stable id, also used to look up i18n strings under `tour.steps.<id>`. */
  id: string;
  /** Ordered list of `data-tour` anchor keys; the first visible one wins. */
  targets?: string[];
  /** Decorative icon shown in the tooltip header. */
  icon?: ReactNode;
  /** Body variants under `tour.steps.<id>.variants.<variant>`; others use `body`. */
  variants?: readonly TourVariant[];
}

/** Copy variant chosen from the pilot's active and training disciplines. */
export type TourVariant = 'glider' | 'ultralight' | 'airline' | 'powered' | 'neutral';

const ICON = 'w-5 h-5';
const ADAPTIVE: readonly TourVariant[] = ['glider', 'ultralight', 'airline', 'powered'];

/**
 * The first-login walkthrough: pick toolkits, set up aircraft + licenses,
 * log and find flights, keep an eye on currency.
 */
export const tourSteps: TourStep[] = [
  { id: 'disciplines', icon: <Compass className={ICON} /> },
  { id: 'welcome' },
  { id: 'dashboard', targets: ['dashboard'], icon: <LayoutDashboard className={ICON} /> },
  { id: 'aircraft', targets: ['aircraft', 'more'], icon: <PlaneTakeoff className={ICON} /> },
  { id: 'licenses', targets: ['licenses', 'more'], icon: <Award className={ICON} /> },
  { id: 'credentials', targets: ['credentials', 'more'], icon: <FileText className={ICON} /> },
  { id: 'addFlight', targets: ['add-flight'], icon: <Plus className={ICON} />, variants: ADAPTIVE },
  { id: 'flights', targets: ['flights'], icon: <Plane className={ICON} /> },
  { id: 'currency', targets: ['currency', 'more'], icon: <Shield className={ICON} />, variants: ADAPTIVE },
  { id: 'finish' },
];

/** True when the profile holds an explicit intent or an acknowledgement. */
export function hasExplicitChoices(profile: PilotProfile | null | undefined): boolean {
  return (profile?.disciplines ?? []).some((s) => s.intent !== 'auto' || !!s.acknowledgedAt);
}

/** The tour for a profile: without the disciplines step once the pilot has chosen. */
export function stepsFor(profile: PilotProfile | null | undefined): TourStep[] {
  return hasExplicitChoices(profile) ? tourSteps.filter((s) => s.id !== 'disciplines') : tourSteps;
}

const POWERED = ['AEROPLANE', 'TMG', 'GYROPLANE', 'HELICOPTER'] as const;

/** Copy variant for the pilot: one aircraft family, airline, or neutral. */
export function tourVariant(d: Disciplines): TourVariant {
  if (!d.isReady || d.mode === 'everything') return 'neutral';
  const on = (x: string) => {
    const s = d.status(x);
    return s === 'active' || s === 'training';
  };
  if (on('MULTI_CREW')) return 'airline';
  const families: TourVariant[] = [];
  if (on('SAILPLANE')) families.push('glider');
  if (on('ULTRALIGHT')) families.push('ultralight');
  if (POWERED.some(on)) families.push('powered');
  return families.length === 1 ? families[0] : 'neutral';
}
