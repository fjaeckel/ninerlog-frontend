import {
  DISCIPLINES,
  type Discipline,
  type DisciplineIntent,
  type PilotProfile,
  type PilotProfileUpdate,
} from '../../hooks/usePilotProfile';

/** A tile's state: I fly this, training for this, or not selected. */
export type Pick = 'on' | 'goal' | 'none';
export type Picks = Record<Discipline, Pick>;

const INTENT: Record<Pick, DisciplineIntent> = { on: 'on', goal: 'goal', none: 'auto' };

/** Tiles as the profile has them: stored intent, else the derived status. */
export function initialPicks(profile: PilotProfile | null | undefined): Picks {
  const picks = Object.fromEntries(DISCIPLINES.map((d) => [d, 'none'])) as Picks;
  for (const s of profile?.disciplines ?? []) {
    if (!(s.discipline in picks)) continue;
    if (s.intent === 'on' || (s.intent === 'auto' && s.status === 'active')) picks[s.discipline] = 'on';
    else if (s.intent === 'goal' || (s.intent === 'auto' && s.status === 'training')) picks[s.discipline] = 'goal';
  }
  return picks;
}

/** Disciplines ticked from logbook evidence alone. */
export function fromLogbook(profile: PilotProfile | null | undefined): Set<Discipline> {
  return new Set(
    (profile?.disciplines ?? [])
      .filter((s) => s.intent === 'auto' && (s.status === 'active' || s.status === 'training'))
      .map((s) => s.discipline),
  );
}

/** The PATCH for the changed tiles plus pending toolkits left ticked; null when nothing to write. */
export function buildUpdate(profile: PilotProfile | null | undefined, picks: Picks): PilotProfileUpdate | null {
  const initial = initialPicks(profile);
  const stored = new Map((profile?.disciplines ?? []).map((s) => [s.discipline, s.intent]));
  const intents: Record<string, DisciplineIntent> = {};
  for (const d of DISCIPLINES) {
    if (picks[d] === initial[d]) continue;
    const intent = INTENT[picks[d]];
    if (intent !== (stored.get(d) ?? 'auto')) intents[d] = intent;
  }
  const acknowledge = (profile?.pendingAcknowledgement ?? []).filter(
    (d) => picks[d] !== undefined && picks[d] !== 'none' && picks[d] === initial[d],
  );
  const body: PilotProfileUpdate = {};
  if (Object.keys(intents).length > 0) body.intents = intents;
  if (acknowledge.length > 0) body.acknowledge = acknowledge;
  return body.intents || body.acknowledge ? body : null;
}
