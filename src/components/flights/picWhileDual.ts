import type { CrewRole, License } from '../../types/api';

/** Crew roles that make the user's flight dual received. */
const INSTRUCTING_ROLES: ReadonlySet<CrewRole> = new Set<CrewRole>(['Instructor', 'Examiner']);

/** Whether the crew has an instructor or examiner on board. */
export function receivesInstruction(crew: ReadonlyArray<{ role: CrewRole }>): boolean {
  return crew.some((m) => INSTRUCTING_ROLES.has(m.role));
}

/** Whether any licence is issued under the FAA. */
export function holdsFaaLicence(licences: ReadonlyArray<Pick<License, 'regulatoryAuthority'>>): boolean {
  return licences.some((l) => /\bFAA\b/i.test(l.regulatoryAuthority ?? ''));
}

export interface PicWhileDualVisibility {
  /** An instructor or examiner is on board and the entry is not an FSTD session. */
  receivingInstruction: boolean;
  /** The user's licences, or undefined while loading or after an error. */
  licences: ReadonlyArray<Pick<License, 'regulatoryAuthority'>> | undefined;
  /** The flight being edited is already logged as PIC and dual. */
  declared: boolean;
}

/**
 * The "PIC while receiving instruction" toggle renders on a dual flight for an
 * FAA licence holder, for a flight already logged that way, and while the
 * licences are unknown.
 */
export function showPicWhileDual({ receivingInstruction, licences, declared }: PicWhileDualVisibility): boolean {
  if (!receivingInstruction) return false;
  if (declared || licences === undefined) return true;
  return holdsFaaLicence(licences);
}

/**
 * The `isPic` declaration a save sends: on create only when set, on edit only
 * when changed, never while the toggle is not rendered.
 */
export function picWhileDualPayload(
  shown: boolean,
  value: boolean,
  loaded: boolean | undefined,
): { isPic?: boolean } {
  if (!shown) return {};
  if (loaded === undefined) return value ? { isPic: true } : {};
  return value === loaded ? {} : { isPic: value };
}
