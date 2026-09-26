/**
 * Persona fixture sets for the screenshot harness — one module per persona in
 * `../../../../ninerlog-api/docs/PERSONAS.md`, built by `build.mjs`.
 *
 *   SHOT_PERSONA=lena npm run shots -- <label>
 *   npm run shots -- <label> --persona=all
 */
import { buildFixtureSet } from './build.mjs';

export const PERSONA_IDS = ['lena', 'jonas', 'karl', 'petra', 'mehmet', 'sabine', 'mark', 'anna', 'ruth'];

/** The fixture set for a persona id: `{ user, bodyFor, pilotProfile, shotAircraft, … }`. */
export async function loadPersona(id) {
  if (!PERSONA_IDS.includes(id)) {
    throw new Error(`Unknown persona "${id}". Known: ${PERSONA_IDS.join(', ')}, all`);
  }
  const { default: persona } = await import(`./${id}.mjs`);
  return buildFixtureSet(persona);
}
