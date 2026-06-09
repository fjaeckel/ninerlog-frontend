import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Plane,
  PlaneTakeoff,
  Award,
  FileText,
  Plus,
  Shield,
} from 'lucide-react';

export interface TourStep {
  /** Stable id, also used to look up i18n strings under `tour.steps.<id>`. */
  id: string;
  /**
   * Ordered list of `data-tour` anchor keys. The first one whose element is
   * actually visible wins, which lets a single step target the desktop sidebar
   * item or fall back to the mobile "More" menu button.
   */
  targets?: string[];
  /** Decorative icon shown in the tooltip header. */
  icon?: ReactNode;
}

const ICON = 'w-5 h-5';

/**
 * The first-login walkthrough. Steps are intentionally ordered to mirror the
 * journey of a brand-new pilot: set up aircraft + licenses, then log and find
 * flights, then keep an eye on currency.
 */
export const tourSteps: TourStep[] = [
  { id: 'welcome' },
  { id: 'dashboard', targets: ['dashboard'], icon: <LayoutDashboard className={ICON} /> },
  { id: 'aircraft', targets: ['aircraft', 'more'], icon: <PlaneTakeoff className={ICON} /> },
  { id: 'licenses', targets: ['licenses', 'more'], icon: <Award className={ICON} /> },
  { id: 'credentials', targets: ['credentials', 'more'], icon: <FileText className={ICON} /> },
  { id: 'addFlight', targets: ['add-flight'], icon: <Plus className={ICON} /> },
  { id: 'flights', targets: ['flights'], icon: <Plane className={ICON} /> },
  { id: 'currency', targets: ['currency', 'more'], icon: <Shield className={ICON} /> },
  { id: 'finish' },
];
