import type { TrainingItem, TrainingProgramme } from '../../hooks/useTrainingProgress';

const item = (key: string, current: number, required: number, unit: TrainingItem['unit'], extra: Partial<TrainingItem> = {}): TrainingItem => {
  const met = current >= required;
  return { key, current, required, unit, met, informational: false, messageKey: met ? 'training.met' : 'training.not_met', ...extra };
};

/** Jonas (P2): dual done, supervised solo and cross-country open, seven signed flights. */
export const jonasSpl = (): TrainingProgramme => ({
  id: 'SPL', discipline: 'SAILPLANE', titleKey: 'training.programme.spl', legalBasis: 'SFCL.130', allMet: false, signedFlights: 7,
  items: [
    item('training.spl.instruction_time', 710, 900, 'minutes'),
    item('training.spl.dual_time', 621, 600, 'minutes'),
    item('training.spl.supervised_solo_time', 89, 120, 'minutes'),
    item('training.spl.launches', 92, 45, 'launches'),
    item('training.spl.cross_country', 0, 1, 'flights'),
  ],
});

/** Anna (G2): first dual flights and 4h 4m of SFCL.130(b) credit from her PPL(A). */
export const annaSpl = (): TrainingProgramme => ({
  id: 'SPL', discipline: 'SAILPLANE', titleKey: 'training.programme.spl', legalBasis: 'SFCL.130', allMet: false, signedFlights: 0,
  items: [
    item('training.spl.instruction_time', 53, 900, 'minutes'),
    item('training.spl.dual_time', 53, 600, 'minutes'),
    item('training.spl.supervised_solo_time', 0, 120, 'minutes'),
    item('training.spl.launches', 7, 45, 'launches'),
    item('training.spl.cross_country', 0, 1, 'flights'),
    item('training.spl.credit_sfcl130b', 244, 420, 'minutes', { met: true, informational: true, messageKey: 'training.credit_available' }),
  ],
});
