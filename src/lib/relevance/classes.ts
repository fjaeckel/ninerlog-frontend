import type { Discipline, Disciplines } from '../../hooks/usePilotProfile';
import type { FeatureId } from './registry';

/** Discipline a rating or aircraft class belongs to; undefined for `OTHER` and unknown classes. */
export function classDiscipline(classType: string | null | undefined): Discipline | undefined {
  const cls = (classType ?? '').trim().toUpperCase();
  if (/^(SEP|MEP|SET)_/.test(cls)) return 'AEROPLANE';
  switch (cls) {
    case 'TMG':
      return 'TMG';
    case 'GLIDER':
      return 'SAILPLANE';
    case 'ULTRALIGHT':
      return 'ULTRALIGHT';
    case 'GYROPLANE':
      return 'GYROPLANE';
    case 'IR':
      return 'IFR';
    default:
      return undefined;
  }
}

const PICKER_FEATURE: Partial<Record<Discipline, FeatureId>> = {
  AEROPLANE: 'classPicker.aeroplane',
  TMG: 'classPicker.tmg',
  SAILPLANE: 'classPicker.glider',
  ULTRALIGHT: 'classPicker.ultralight',
  GYROPLANE: 'classPicker.gyroplane',
  IFR: 'classPicker.ir',
};

/** Registry feature of a class picker option; undefined for classes that never fold. */
export const classPickerFeature = (classType: string): FeatureId | undefined => {
  const d = classDiscipline(classType);
  return d ? PICKER_FEATURE[d] : undefined;
};

/** Whether ratings of `classType` belong to a discipline the pilot has not flown in 24 months. */
export const isDormantClass = (d: Disciplines, classType: string | null | undefined): boolean => {
  const disc = classDiscipline(classType);
  return !!disc && d.isReady && d.mode !== 'everything' && d.status(disc) === 'dormant';
};
