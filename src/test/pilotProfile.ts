import { DISCIPLINES, type PilotProfile } from '../hooks/usePilotProfile';

/** A profile with `SAILPLANE` active from an SPL and every other discipline off. */
export const gliderProfile = (over: Partial<PilotProfile> = {}): PilotProfile => ({
  mode: 'adaptive',
  pendingAcknowledgement: [],
  disciplines: DISCIPLINES.map((d) => ({
    discipline: d,
    status: d === 'SAILPLANE' ? 'active' : 'off',
    intent: 'auto',
    evidence: d === 'SAILPLANE' ? [{ source: 'LICENCE', strength: 'strong', ref: 'SPL 12345' }] : [],
    ulKinds: [],
  })),
  ...over,
});
