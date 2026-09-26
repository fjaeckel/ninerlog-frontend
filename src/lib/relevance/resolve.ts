import { DISCIPLINES, type Disciplines } from '../../hooks/usePilotProfile';
import type { FeatureDef, RelevanceCtx } from './registry';

/** Why an element is shown or folded, as data; `useRelevance` localises it. */
export type RelevanceCause =
  | { kind: 'all' }
  | { kind: 'unknownFeature' }
  | { kind: 'hasData' }
  | { kind: 'everything' }
  | { kind: 'failOpen' }
  | { kind: 'aircraft'; match: boolean }
  | { kind: 'evidence'; discipline: string; ref: string }
  | { kind: 'intentOn'; discipline: string }
  | { kind: 'goal'; discipline: string }
  | { kind: 'active'; discipline: string }
  | { kind: 'folded'; disciplines: readonly string[] };

export interface RelevanceDecision {
  visible: boolean;
  folded: boolean;
  cause: RelevanceCause;
}

/** Whether any known discipline is active or training. */
const hasAnyDiscipline = (d: Disciplines) =>
  DISCIPLINES.some((x) => {
    const s = d.status(x);
    return s === 'active' || s === 'training';
  });

const shown = (cause: RelevanceCause): RelevanceDecision => ({ visible: true, folded: false, cause });

/**
 * Decides whether a feature is shown or folded.
 * Order: unknown feature, `all`, data on the record, everything mode, profile unavailable
 * or without any active or training discipline, `relevantWhen` or the selected aircraft
 * (when the feature matches aircraft), then the pilot's disciplines.
 */
export function resolveRelevance(
  def: FeatureDef | undefined,
  d: Disciplines,
  ctx: RelevanceCtx = {},
): RelevanceDecision {
  if (!def) return shown({ kind: 'unknownFeature' });
  if (def.serves === 'all') return shown({ kind: 'all' });
  if (def.hasData?.(ctx)) return shown({ kind: 'hasData' });
  if (d.mode === 'everything') return shown({ kind: 'everything' });
  if (!d.isReady || !hasAnyDiscipline(d)) return shown({ kind: 'failOpen' });
  if (def.relevantWhen && !def.relevantWhen(d, ctx)) {
    return { visible: false, folded: true, cause: { kind: 'folded', disciplines: def.serves } };
  }
  if (def.relevantWhen && ctx.aircraft) return shown({ kind: 'aircraft', match: true });
  if (!def.relevantWhen && ctx.aircraft && def.aircraftMatch) {
    const match = def.aircraftMatch(ctx.aircraft);
    return { visible: match, folded: !match, cause: { kind: 'aircraft', match } };
  }
  for (const disc of def.serves) {
    const status = d.status(disc);
    if (status !== 'active' && status !== 'training') continue;
    const intent = d.intent(disc);
    if (intent === 'on') return shown({ kind: 'intentOn', discipline: disc });
    if (intent === 'goal' && status === 'training') return shown({ kind: 'goal', discipline: disc });
    const ev = d.evidence(disc)[0];
    return shown(ev ? { kind: 'evidence', discipline: disc, ref: ev.ref } : { kind: 'active', discipline: disc });
  }
  if (def.relevantWhen) return shown({ kind: 'aircraft', match: true });
  return { visible: false, folded: true, cause: { kind: 'folded', disciplines: def.serves } };
}
