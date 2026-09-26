/**
 * G3 — Ruth, new account with no data (guard, PERSONAS.md). No licences,
 * aircraft, credentials or flights; every discipline resolves to off.
 */
import { makeUser, shift } from './build.mjs';

const user = makeUser({ id: 'u1', email: 'ruth.neumann@example.com', name: 'Ruth Neumann', createdAt: shift(-1), updatedAt: shift(-1) });

export default {
  id: 'ruth',
  user,
  aircraft: [], licenses: [], classRatings: {}, credentials: [], contacts: [], flights: [],
  currency: { ratings: [], passengerCurrency: [] },
  airports: {},
  expectedDisciplines: {},
  shotAircraft: [],
};
