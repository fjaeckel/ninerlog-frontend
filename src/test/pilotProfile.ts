import { DISCIPLINES, type Discipline, type DisciplineStatus, type PilotProfile } from '../hooks/usePilotProfile';

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

/** A profile with the given statuses and every other discipline off. */
export const profileWith = (
  statuses: Partial<Record<Discipline, DisciplineStatus>>,
  over: Partial<PilotProfile> = {},
): PilotProfile => ({
  mode: 'adaptive',
  pendingAcknowledgement: [],
  disciplines: DISCIPLINES.map((d) => ({
    discipline: d,
    status: statuses[d] ?? 'off',
    intent: 'auto',
    evidence: statuses[d] ? [{ source: 'FLIGHTS', strength: statuses[d] === 'dormant' ? 'dormant' : 'recent', ref: `${d} flights` }] : [],
    ulKinds: [],
  })),
  ...over,
});

/** Persona profiles from docs/PERSONAS.md. */
export const PERSONA_PROFILES = {
  lena: () => profileWith({ SAILPLANE: 'active' }),
  karl: () => profileWith({ TMG: 'active', SAILPLANE: 'dormant' }),
  petra: () => profileWith({ SAILPLANE: 'active', AEROPLANE: 'active', INSTRUCTOR: 'active' }),
  mehmet: () => profileWith({ ULTRALIGHT: 'active', AEROPLANE: 'dormant' }),
  sabine: () => profileWith({ ULTRALIGHT: 'active' }),
  mark: () => profileWith({ AEROPLANE: 'active', IFR: 'active', MULTI_CREW: 'active', SIMULATOR: 'active' }),
};
