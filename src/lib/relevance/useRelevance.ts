import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useDisciplines } from '../../hooks/usePilotProfile';
import { getFeature, type FeatureId, type RelevanceCtx } from './registry';
import { resolveRelevance, type RelevanceCause } from './resolve';
import { toolkitLabel, toolkitName } from './names';

export interface Relevance {
  visible: boolean;
  folded: boolean;
  /** Localised explanation of the decision, when there is one to give. */
  reason?: string;
}

/** Localised reason for a relevance cause; undefined for causes that need none. */
export function relevanceReason(t: TFunction, cause: RelevanceCause): string | undefined {
  switch (cause.kind) {
    case 'hasData':
      return t('relevance:reason.hasData');
    case 'everything':
      return t('relevance:reason.everything');
    case 'aircraft':
      return t(cause.match ? 'relevance:reason.aircraft' : 'relevance:reason.aircraftNoMatch');
    case 'evidence':
      return t('relevance:reason.evidence', { ref: cause.ref });
    case 'intentOn':
      return t('relevance:reason.intentOn', { toolkit: toolkitLabel(t, cause.discipline) });
    case 'goal':
      return t('relevance:reason.goal', { name: toolkitName(t, cause.discipline) });
    case 'active':
      return t('relevance:reason.active', { toolkit: toolkitLabel(t, cause.discipline) });
    case 'folded':
      return t('relevance:reason.folded', { names: cause.disciplines.map((d) => toolkitName(t, d)).join(', ') });
    default:
      return undefined;
  }
}

/** Whether feature `id` is shown or folded for the signed-in pilot in `ctx`, and why. */
export function useRelevance(id: FeatureId, ctx?: RelevanceCtx): Relevance {
  const { t } = useTranslation('relevance');
  const disciplines = useDisciplines();
  const aircraft = ctx?.aircraft;
  const record = ctx?.record;
  return useMemo(() => {
    const decision = resolveRelevance(getFeature(id), disciplines, { aircraft, record });
    return { visible: decision.visible, folded: decision.folded, reason: relevanceReason(t, decision.cause) };
  }, [id, disciplines, aircraft, record, t]);
}
