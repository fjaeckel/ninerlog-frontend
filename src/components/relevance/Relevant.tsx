import type { ReactNode } from 'react';
import { useRelevance, type FeatureId, type RelevanceCtx } from '../../lib/relevance';
import { Folded } from './FoldDrawer';

interface RelevantProps {
  id: FeatureId;
  ctx?: RelevanceCtx;
  children: ReactNode;
}

/** Renders children when feature `id` is relevant, otherwise folds them into the nearest `<FoldDrawer />`. */
export function Relevant({ id, ctx, children }: RelevantProps) {
  const { visible, reason } = useRelevance(id, ctx);
  if (visible) return <>{children}</>;
  return <Folded reason={reason}>{children}</Folded>;
}
