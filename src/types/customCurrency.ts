import type { CurrencyRequirement, CurrencyStatus } from './api';

/**
 * Types for user-authored ("custom") currency rules. These mirror the API's
 * models.CustomCurrencyRule* structures. The rule body (window + filters +
 * requirements) is what the YAML builder authors; the evaluation is what the
 * cards render.
 */

export type WindowUnit = 'days' | 'weeks' | 'months' | 'years';
export type FilterOp = 'eq' | 'in' | 'is_true';

export interface CurrencyWindow {
  amount: number;
  unit: WindowUnit;
}

export interface CurrencyFilter {
  field: string;
  op: FilterOp;
  value?: string;
  values?: string[];
}

export interface CurrencyRequirementDef {
  metric: string;
  min: number;
  unit?: 'hours' | 'minutes';
  label?: string;
}

export interface CustomCurrencyRuleBody {
  window: CurrencyWindow;
  filters?: CurrencyFilter[];
  requirements: CurrencyRequirementDef[];
}

export interface CustomCurrencyRule {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  definition: CustomCurrencyRuleBody;
  isShared: boolean;
  shareToken?: string | null;
  importedFrom?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomCurrencyEvaluation {
  status: CurrencyStatus;
  windowLabel: string;
  requirements: CurrencyRequirement[];
  evaluatedAt: string;
}

export interface CustomRuleWithStatus {
  rule: CustomCurrencyRule;
  evaluation: CustomCurrencyEvaluation;
}

export interface SharedRuleView {
  name: string;
  description?: string | null;
  emoji?: string | null;
  definition: CustomCurrencyRuleBody;
  shareToken: string;
}

/** Payload for create/update. */
export interface CustomRuleInput {
  name: string;
  description?: string | null;
  emoji?: string | null;
  definition: CustomCurrencyRuleBody;
}

/** The controlled vocabulary, kept in sync with the API for builder hints. */
export const METRIC_OPTIONS: { value: string; label: string; time: boolean }[] = [
  { value: 'flights', label: 'Flights', time: false },
  { value: 'landings', label: 'Landings', time: false },
  { value: 'day_landings', label: 'Day landings', time: false },
  { value: 'night_landings', label: 'Night landings', time: false },
  { value: 'takeoffs', label: 'Takeoffs', time: false },
  { value: 'day_takeoffs', label: 'Day takeoffs', time: false },
  { value: 'night_takeoffs', label: 'Night takeoffs', time: false },
  { value: 'approaches', label: 'Approaches', time: false },
  { value: 'holds', label: 'Holds', time: false },
  { value: 'total_time', label: 'Total time', time: true },
  { value: 'pic_time', label: 'PIC time', time: true },
  { value: 'dual_time', label: 'Dual time', time: true },
  { value: 'night_time', label: 'Night time', time: true },
  { value: 'ifr_time', label: 'Instrument time', time: true },
  { value: 'cross_country_time', label: 'Cross-country time', time: true },
];

/** Class types (mirrors models.ClassType) — used for eq/in value pickers. */
export const CLASS_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'SEP_LAND', label: 'SEP (Land)' },
  { value: 'SEP_SEA', label: 'SEP (Sea)' },
  { value: 'MEP_LAND', label: 'MEP (Land)' },
  { value: 'MEP_SEA', label: 'MEP (Sea)' },
  { value: 'SET_LAND', label: 'SET (Land)' },
  { value: 'SET_SEA', label: 'SET (Sea)' },
  { value: 'TMG', label: 'TMG' },
  { value: 'IR', label: 'Instrument Rating' },
  { value: 'OTHER', label: 'Other' },
];

/** Launch methods (mirrors flight.launch_method). */
export const LAUNCH_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'winch', label: 'Winch' },
  { value: 'aerotow', label: 'Aerotow' },
  { value: 'self-launch', label: 'Self-launch' },
];

export const FILTER_FIELD_OPTIONS: { value: string; label: string; ops: FilterOp[] }[] = [
  { value: 'aircraft_class', label: 'Aircraft class', ops: ['eq', 'in'] },
  { value: 'aircraft_type', label: 'Aircraft type', ops: ['eq', 'in'] },
  { value: 'aircraft_registration', label: 'Registration', ops: ['eq', 'in'] },
  { value: 'launch_method', label: 'Launch method', ops: ['eq', 'in'] },
  { value: 'aircraft_complex', label: 'Complex aircraft', ops: ['is_true'] },
  { value: 'aircraft_high_performance', label: 'High-performance aircraft', ops: ['is_true'] },
  { value: 'aircraft_tailwheel', label: 'Tailwheel aircraft', ops: ['is_true'] },
  { value: 'is_pic', label: 'As PIC', ops: ['is_true'] },
  { value: 'is_dual', label: 'Dual', ops: ['is_true'] },
  { value: 'has_night', label: 'Has night time', ops: ['is_true'] },
  { value: 'has_ifr', label: 'Has instrument time', ops: ['is_true'] },
  { value: 'is_cross_country', label: 'Cross-country', ops: ['is_true'] },
];
