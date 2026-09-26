import type { components } from '../api/schema';
import type { FeatureId } from './relevance/registry';
import { LAUNCH_METHODS, isLaunchMethod } from './launchMethod';
import { UL_RATING_KINDS } from './ultralight';

export type LicencePrivilegeKind = components['schemas']['LicencePrivilegeKind'];
export type LicencePrivilege = components['schemas']['LicencePrivilege'];
export type LicencePrivilegeCreate = components['schemas']['LicencePrivilegeCreate'];
export type LicencePrivilegeUpdate = components['schemas']['LicencePrivilegeUpdate'];

/** Privilege kinds, in picker order. */
export const PRIVILEGE_KINDS: readonly LicencePrivilegeKind[] = [
  'SAILPLANE_TOWING', 'BANNER_TOWING', 'CLOUD_FLYING', 'AEROBATIC_BASIC', 'AEROBATIC_ADVANCED',
  'LAUNCH_METHOD_TRAINED', 'TMG_NIGHT',
  'FI_S', 'BI_S', 'FE_S',
  'UL_PASSENGER_AUTH', 'UL_TOWING', 'UL_TYPE_BRIEFING',
];

/** Registry feature deciding where a kind sits in the picker. */
export const PRIVILEGE_PICKER_FEATURE: Record<LicencePrivilegeKind, FeatureId> = {
  SAILPLANE_TOWING: 'privilegePicker.sailplane',
  BANNER_TOWING: 'privilegePicker.sailplane',
  CLOUD_FLYING: 'privilegePicker.sailplane',
  AEROBATIC_BASIC: 'privilegePicker.sailplane',
  AEROBATIC_ADVANCED: 'privilegePicker.sailplane',
  LAUNCH_METHOD_TRAINED: 'privilegePicker.sailplane',
  TMG_NIGHT: 'privilegePicker.tmg',
  FI_S: 'privilegePicker.instructor',
  BI_S: 'privilegePicker.instructor',
  FE_S: 'privilegePicker.instructor',
  UL_PASSENGER_AUTH: 'privilegePicker.ultralight',
  UL_TOWING: 'privilegePicker.ultralight',
  UL_TYPE_BRIEFING: 'privilegePicker.ultralight',
};

/** What a kind's `detail` holds. */
export type PrivilegeDetailKind = 'launchMethod' | 'ulKind' | 'aircraftType' | 'free';

export function privilegeDetailKind(kind: LicencePrivilegeKind): PrivilegeDetailKind {
  switch (kind) {
    case 'LAUNCH_METHOD_TRAINED':
      return 'launchMethod';
    case 'UL_TOWING':
      return 'ulKind';
    case 'UL_TYPE_BRIEFING':
      return 'aircraftType';
    default:
      return 'free';
  }
}

export const PRIVILEGE_DETAIL_MAX = 100;
export const PRIVILEGE_NOTES_MAX = 1000;

export interface PrivilegeDraft {
  kind: LicencePrivilegeKind;
  detail: string;
  issuedOn: string;
  expiresOn: string;
  notes: string;
}

export type PrivilegeDraftError = 'detailRequired' | 'detailInvalid' | 'detailTooLong' | 'expiryBeforeIssue' | 'notesTooLong';

/** The first rule of `POST /licenses/{id}/privileges` the draft breaks, or null. */
export function validatePrivilegeDraft(d: PrivilegeDraft): PrivilegeDraftError | null {
  const detail = d.detail.trim();
  const detailKind = privilegeDetailKind(d.kind);
  if (detailKind !== 'free' && !detail) return 'detailRequired';
  if (detailKind === 'launchMethod' && !isLaunchMethod(detail.toLowerCase())) return 'detailInvalid';
  if (detailKind === 'ulKind' && !(UL_RATING_KINDS as readonly string[]).includes(detail.toUpperCase())) return 'detailInvalid';
  if (detail.length > PRIVILEGE_DETAIL_MAX) return 'detailTooLong';
  if (d.issuedOn && d.expiresOn && d.expiresOn < d.issuedOn) return 'expiryBeforeIssue';
  if (d.notes.length > PRIVILEGE_NOTES_MAX) return 'notesTooLong';
  return null;
}

/** Normalises `detail` the way the API stores it. */
export function normalisePrivilegeDetail(kind: LicencePrivilegeKind, detail: string): string {
  const v = detail.trim();
  switch (privilegeDetailKind(kind)) {
    case 'launchMethod':
      return v.toLowerCase();
    case 'ulKind':
      return v.toUpperCase();
    default:
      return v;
  }
}

/** Create body for a valid draft. */
export function privilegeCreateBody(d: PrivilegeDraft): LicencePrivilegeCreate {
  const detail = normalisePrivilegeDetail(d.kind, d.detail);
  return {
    kind: d.kind,
    ...(detail ? { detail } : {}),
    ...(d.issuedOn ? { issuedOn: d.issuedOn } : {}),
    ...(d.expiresOn ? { expiresOn: d.expiresOn } : {}),
    ...(d.notes.trim() ? { notes: d.notes.trim() } : {}),
  };
}

/** Patch body for a valid draft; an emptied field is sent as null. */
export function privilegeUpdateBody(d: PrivilegeDraft): LicencePrivilegeUpdate {
  const detail = normalisePrivilegeDetail(d.kind, d.detail);
  return {
    kind: d.kind,
    detail: detail || null,
    issuedOn: d.issuedOn || null,
    expiresOn: d.expiresOn || null,
    notes: d.notes.trim() || null,
  };
}

export const emptyPrivilegeDraft = (kind: LicencePrivilegeKind): PrivilegeDraft => ({
  kind, detail: '', issuedOn: '', expiresOn: '', notes: '',
});

export const draftFromPrivilege = (p: LicencePrivilege): PrivilegeDraft => ({
  kind: p.kind,
  detail: p.detail ?? '',
  issuedOn: p.issuedOn?.slice(0, 10) ?? '',
  expiresOn: p.expiresOn?.slice(0, 10) ?? '',
  notes: p.notes ?? '',
});

export { LAUNCH_METHODS };
