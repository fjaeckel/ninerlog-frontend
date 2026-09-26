import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import i18n from '../../i18n';
import en from '../../i18n/locales/en/currency.json';
import de from '../../i18n/locales/de/currency.json';
import {
  TRAINING_MESSAGE_KEYS,
  formatTrainingAmount,
  formatTrainingProgress,
  itemLegalBasis,
  trainingItemMessage,
} from '../../lib/training';
import { formatDuration } from '../../lib/duration';

const hm = (m: number) => formatDuration(m, 'hm');
const t = i18n.t.bind(i18n);

/** ninerlog-api docs/CURRENCY_MESSAGES.md next to this checkout, or at $NINERLOG_API_DIR. */
const DOC = [process.env.NINERLOG_API_DIR, resolve(__dirname, '../../../../ninerlog-api')]
  .filter((d): d is string => !!d)
  .map((d) => resolve(d, 'docs/CURRENCY_MESSAGES.md'))
  .find((p) => existsSync(p));

const lookup = (bundle: unknown, key: string) =>
  `messages.${key}`.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], bundle);

describe('training.* message keys', () => {
  it.each(TRAINING_MESSAGE_KEYS)('%s has an English and a German string', (key) => {
    expect(typeof lookup(en, key)).toBe('string');
    expect(typeof lookup(de, key)).toBe('string');
    expect(lookup(de, key)).not.toBe('');
  });

  it.skipIf(!DOC)('matches the "Training progress" section of CURRENCY_MESSAGES.md', () => {
    const doc = readFileSync(DOC!, 'utf8');
    const section = doc.slice(doc.indexOf('## Training progress'), doc.indexOf('## Adding a key'));
    const documented = [...new Set([...section.matchAll(/^\| `(training\.[a-z0-9_.]+)`/gm)].map((m) => m[1]))].sort();
    expect(documented.length).toBeGreaterThan(0);
    expect([...TRAINING_MESSAGE_KEYS].sort()).toEqual(documented);
  });
});

describe('training formatting', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('formats every unit', () => {
    expect(formatTrainingProgress(t, { current: 89, required: 120, unit: 'minutes' }, hm)).toBe('1h 29m / 2h 0m');
    expect(formatTrainingProgress(t, { current: 92, required: 45, unit: 'launches' }, hm)).toBe('92 / 45 launches');
    expect(formatTrainingProgress(t, { current: 3, required: 12, unit: 'landings' }, hm)).toBe('3 / 12 landings');
    expect(formatTrainingProgress(t, { current: 0, required: 1, unit: 'flights' }, hm)).toBe('0 / 1 flights');
    expect(formatTrainingProgress(t, { current: 48, required: 50, unit: 'km' }, hm)).toBe('48 / 50 km');
  });

  it('formats remaining amounts with plurals and the user duration format', () => {
    expect(formatTrainingAmount(t, 1, 'launches', hm)).toBe('1 launch');
    expect(formatTrainingAmount(t, 2, 'flights', hm)).toBe('2 flights');
    expect(formatTrainingAmount(t, 2, 'km', hm)).toBe('2 km');
    expect(formatTrainingAmount(t, 90, 'minutes', (m) => formatDuration(m, 'decimal', 'comma'))).toBe('1,5h');
  });

  it('formats in German', async () => {
    await i18n.changeLanguage('de');
    expect(formatTrainingProgress(t, { current: 7, required: 45, unit: 'launches' }, hm)).toBe('7 / 45 Starts');
    expect(formatTrainingAmount(t, 1, 'flights', hm)).toBe('1 Flug');
  });

  it('fills the remaining amount into not_met and never goes negative', () => {
    const item = { key: 'training.spl.launches', current: 38, required: 45, unit: 'launches' as const, met: false, informational: false, messageKey: 'training.not_met' };
    expect(trainingItemMessage(t, item, hm)).toBe('7 launches to go');
    expect(trainingItemMessage(t, { ...item, current: 50, messageKey: 'training.not_met' }, hm)).toBe('0 launches to go');
  });

  it('an unknown message key renders nothing rather than the raw key', () => {
    const item = { key: 'training.spl.launches', current: 1, required: 45, unit: 'launches' as const, met: false, informational: false, messageKey: 'training.something_new' };
    expect(trainingItemMessage(t, item, hm)).toBe('');
  });

  it('names the article per item', () => {
    const spl = { legalBasis: 'SFCL.130' };
    expect(itemLegalBasis('training.spl.dual_time', spl)).toBe('SFCL.130(a)');
    expect(itemLegalBasis('training.spl.credit_sfcl130b', spl)).toBe('SFCL.130(b)');
    expect(itemLegalBasis('training.tmg.dual_time', { legalBasis: 'SFCL.150(b)' })).toBe('SFCL.150(b)');
    expect(itemLegalBasis('training.ul.solo_time', { legalBasis: 'LuftPersV §42' })).toBe('LuftPersV §42');
  });
});
