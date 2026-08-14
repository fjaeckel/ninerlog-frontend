/**
 * Local password policy, mirrored from the API's `validatePassword`
 * (`internal/service/password_policy.go` in ninerlog-api). The server is
 * authoritative — this module exists to tell the user *before* they submit
 * which rules a password still fails. Keep the two in step.
 */

export const PASSWORD_MIN_LENGTH = 12;
/** bcrypt truncates beyond 72 bytes, so the API refuses anything longer. */
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_RULE_IDS = [
  'length',
  'lowercase',
  'uppercase',
  'digit',
  'special',
] as const;

export type PasswordRuleId = (typeof PASSWORD_RULE_IDS)[number];

/** Maps 1:1 onto the meter's three colors: red, amber, green. */
export type PasswordStrengthLevel = 'weak' | 'fair' | 'strong';

export interface PasswordStrength {
  /** Which rules the password currently satisfies. */
  rules: Record<PasswordRuleId, boolean>;
  /** How many of the five rules are satisfied, 0–5. */
  satisfiedCount: number;
  level: PasswordStrengthLevel;
  /** True only when every rule passes — i.e. the API would accept it. */
  isValid: boolean;
}

// Unicode property escapes rather than plain [a-z]/[A-Z]/[0-9], so accented and
// non-Latin letters classify the same way Go's unicode package classifies them.
const LOWERCASE = /\p{Ll}/u;
const UPPERCASE = /[\p{Lu}\p{Lt}]/u;
const DIGIT = /\p{Nd}/u;
// "Special" is anything that is neither a letter nor a number, which is how the
// API defines it — punctuation, symbols and spaces all count.
const SPECIAL = /[^\p{L}\p{N}]/u;

const encoder = new TextEncoder();

/**
 * The API measures length in bytes (bcrypt's own unit), so a multi-byte
 * character costs more than one. Measuring UTF-16 code units here would let a
 * password look acceptable in the browser and be rejected by the server.
 */
export function passwordByteLength(password: string): number {
  return encoder.encode(password).length;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const bytes = passwordByteLength(password);

  const rules: Record<PasswordRuleId, boolean> = {
    length: bytes >= PASSWORD_MIN_LENGTH && bytes <= PASSWORD_MAX_LENGTH,
    lowercase: LOWERCASE.test(password),
    uppercase: UPPERCASE.test(password),
    digit: DIGIT.test(password),
    special: SPECIAL.test(password),
  };

  const satisfiedCount = PASSWORD_RULE_IDS.filter((id) => rules[id]).length;

  // Three buckets so the meter reads red → amber → green. Only a password that
  // satisfies every rule earns green, because only that one will be accepted.
  const level: PasswordStrengthLevel =
    satisfiedCount === PASSWORD_RULE_IDS.length
      ? 'strong'
      : satisfiedCount >= 3
        ? 'fair'
        : 'weak';

  return {
    rules,
    satisfiedCount,
    level,
    isValid: satisfiedCount === PASSWORD_RULE_IDS.length,
  };
}

/** Convenience predicate for form schemas. */
export function isPasswordValid(password: string): boolean {
  return evaluatePasswordStrength(password).isValid;
}

export type PasswordIssue = 'tooShort' | 'tooLong' | 'tooWeak';

/**
 * The single reason a password would be rejected, or null if it passes.
 *
 * Length is reported before complexity so the user sees the most actionable
 * problem first, matching the order the API validates in.
 */
export function passwordIssue(password: string): PasswordIssue | null {
  const { rules, isValid } = evaluatePasswordStrength(password);
  if (!rules.length) {
    return passwordByteLength(password) < PASSWORD_MIN_LENGTH ? 'tooShort' : 'tooLong';
  }
  return isValid ? null : 'tooWeak';
}

/**
 * Translation-key suffixes for each issue, so a form can resolve them against
 * whichever namespace section it lives in.
 */
export const PASSWORD_ISSUE_KEYS: Record<PasswordIssue, string> = {
  tooShort: 'passwordMinLength',
  tooLong: 'passwordMaxLength',
  tooWeak: 'passwordTooWeak',
};
