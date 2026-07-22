import { describe, it, expect } from 'vitest';
import { yamlToInput, ruleToYaml, STARTER_YAML, YamlRuleError } from '../../lib/customCurrencyYaml';

describe('customCurrencyYaml', () => {
  it('parses the starter template into a valid input', () => {
    const input = yamlToInput(STARTER_YAML);
    expect(input.name).toBe('Night landings');
    expect(input.emoji).toBe('🌙');
    expect(input.definition.window).toEqual({ amount: 90, unit: 'days' });
    expect(input.definition.requirements[0]).toMatchObject({ metric: 'night_landings', min: 3 });
    expect(input.definition.filters?.[0]).toEqual({ field: 'has_night', op: 'is_true' });
  });

  it('round-trips a rule through YAML', () => {
    const input = yamlToInput(STARTER_YAML);
    const yaml = ruleToYaml(input);
    const reparsed = yamlToInput(yaml);
    expect(reparsed).toEqual(input);
  });

  it('omits an empty filters block on output', () => {
    const yaml = ruleToYaml({
      name: 'Hours',
      definition: { window: { amount: 12, unit: 'months' }, requirements: [{ metric: 'total_time', min: 12 }] },
    });
    expect(yaml).not.toContain('filters');
    expect(yaml).toContain('total_time');
  });

  it('rejects a document without a name', () => {
    expect(() => yamlToInput('window:\n  amount: 90\n  unit: days\nrequirements:\n  - metric: landings\n    min: 3')).toThrow(YamlRuleError);
  });

  it('rejects a document without requirements', () => {
    expect(() => yamlToInput('name: X\nwindow:\n  amount: 90\n  unit: days')).toThrow(YamlRuleError);
  });

  it('reports malformed YAML as a YamlRuleError', () => {
    expect(() => yamlToInput('name: [unclosed')).toThrow(YamlRuleError);
  });
});
