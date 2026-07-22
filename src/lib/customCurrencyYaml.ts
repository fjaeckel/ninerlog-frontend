import yaml from 'js-yaml';
import type { CustomRuleInput, CustomCurrencyRuleBody } from '../types/customCurrency';

/**
 * Conversion between the YAML a pilot authors and the CustomRuleInput the API
 * expects. The authored document is flat and friendly: metadata (name, emoji,
 * description) sits alongside the rule body (window, filters, requirements). A
 * shared rule round-trips through the same format, so a link recipient sees the
 * exact YAML the author wrote.
 */

export const STARTER_YAML = `# Give your rule a name and (optionally) an emoji.
name: Night landings
emoji: "🌙"
description: Stay night-current for carrying passengers.

# How far back to look.
window:
  amount: 90
  unit: days        # days | weeks | months | years

# Which flights count (optional). Remove this block to count every flight.
filters:
  - field: has_night
    op: is_true

# What you need. All requirements must be met to stay "current".
requirements:
  - metric: night_landings
    min: 3
    label: Night landings
`;

export class YamlRuleError extends Error {}

interface ParsedDoc {
  name?: unknown;
  emoji?: unknown;
  description?: unknown;
  window?: unknown;
  filters?: unknown;
  requirements?: unknown;
}

/** Parse authored YAML into a CustomRuleInput. Throws YamlRuleError with a
 *  human-readable message on malformed input. Full semantic validation is left
 *  to the API; this only guards obvious shape errors so the editor can react. */
export function yamlToInput(text: string): CustomRuleInput {
  let doc: ParsedDoc;
  try {
    doc = (yaml.load(text) || {}) as ParsedDoc;
  } catch (e) {
    throw new YamlRuleError(e instanceof Error ? e.message : 'Invalid YAML');
  }
  if (typeof doc !== 'object' || Array.isArray(doc)) {
    throw new YamlRuleError('The rule must be a YAML mapping.');
  }
  if (typeof doc.name !== 'string' || doc.name.trim() === '') {
    throw new YamlRuleError('Add a "name" for your rule.');
  }
  if (typeof doc.window !== 'object' || doc.window === null) {
    throw new YamlRuleError('Add a "window" block (amount + unit).');
  }
  if (!Array.isArray(doc.requirements) || doc.requirements.length === 0) {
    throw new YamlRuleError('Add at least one requirement.');
  }

  const definition: CustomCurrencyRuleBody = {
    window: doc.window as CustomCurrencyRuleBody['window'],
    requirements: doc.requirements as CustomCurrencyRuleBody['requirements'],
  };
  if (Array.isArray(doc.filters) && doc.filters.length > 0) {
    definition.filters = doc.filters as CustomCurrencyRuleBody['filters'];
  }

  return {
    name: doc.name.trim(),
    emoji: typeof doc.emoji === 'string' ? doc.emoji : null,
    description: typeof doc.description === 'string' ? doc.description : null,
    definition,
  };
}

/** Render a rule (metadata + body) back to the authoring YAML format. */
export function ruleToYaml(input: {
  name: string;
  emoji?: string | null;
  description?: string | null;
  definition: CustomCurrencyRuleBody;
}): string {
  const doc: Record<string, unknown> = { name: input.name };
  if (input.emoji) doc.emoji = input.emoji;
  if (input.description) doc.description = input.description;
  doc.window = input.definition.window;
  if (input.definition.filters && input.definition.filters.length > 0) {
    doc.filters = input.definition.filters;
  }
  doc.requirements = input.definition.requirements;
  return yaml.dump(doc, { lineWidth: 80, noRefs: true });
}
