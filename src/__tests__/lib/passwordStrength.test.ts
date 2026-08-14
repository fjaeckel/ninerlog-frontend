import { describe, it, expect } from 'vitest';
import {
  evaluatePasswordStrength,
  isPasswordValid,
  passwordByteLength,
  passwordIssue,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../lib/passwordStrength';

describe('evaluatePasswordStrength', () => {
  it('marks a password satisfying every rule as strong and valid', () => {
    const result = evaluatePasswordStrength('SecurePass123!');
    expect(result.rules).toEqual({
      length: true,
      lowercase: true,
      uppercase: true,
      digit: true,
      special: true,
    });
    expect(result.satisfiedCount).toBe(5);
    expect(result.level).toBe('strong');
    expect(result.isValid).toBe(true);
  });

  it('reports an empty password as weak with nothing satisfied', () => {
    const result = evaluatePasswordStrength('');
    expect(result.satisfiedCount).toBe(0);
    expect(result.level).toBe('weak');
    expect(result.isValid).toBe(false);
  });

  it.each([
    ['no lowercase', 'ABCDEFGHIJ1!', 'lowercase'],
    ['no uppercase', 'abcdefghij1!', 'uppercase'],
    ['no digit', 'Abcdefghijk!', 'digit'],
    ['no special', 'Abcdefghij12', 'special'],
  ] as const)('flags a long password with %s', (_name, password, missing) => {
    const result = evaluatePasswordStrength(password);
    expect(result.rules[missing]).toBe(false);
    expect(result.rules.length).toBe(true);
    expect(result.isValid).toBe(false);
    // Four of five rules met — amber, not red, and never green.
    expect(result.level).toBe('fair');
  });

  it('steps weak → fair → strong as classes are added', () => {
    // 1 rule (lowercase only): weak
    expect(evaluatePasswordStrength('abc').level).toBe('weak');
    // 3 rules (length + lowercase + uppercase): fair
    expect(evaluatePasswordStrength('Abcdefghijkl').level).toBe('fair');
    // 5 rules: strong
    expect(evaluatePasswordStrength('Abcdefghij1!').level).toBe('strong');
  });

  it('accepts a space as the special character', () => {
    expect(isPasswordValid('Secure Pass123')).toBe(true);
  });

  it('classifies accented letters by case rather than treating them as special', () => {
    const result = evaluatePasswordStrength('übungsflug');
    expect(result.rules.lowercase).toBe(true);
    expect(result.rules.special).toBe(false);
  });

  it.each([
    ['exactly the minimum', 'aB1!' + 'x'.repeat(PASSWORD_MIN_LENGTH - 4), true],
    ['one below the minimum', 'aB1!' + 'x'.repeat(PASSWORD_MIN_LENGTH - 5), false],
    ['exactly the maximum', 'aB1!' + 'x'.repeat(PASSWORD_MAX_LENGTH - 4), true],
    ['one above the maximum', 'aB1!' + 'x'.repeat(PASSWORD_MAX_LENGTH - 3), false],
  ])('handles a password of %s length', (_name, password, expected) => {
    expect(evaluatePasswordStrength(password).rules.length).toBe(expected);
  });

  it('measures length in UTF-8 bytes, as the API does', () => {
    // 36 two-byte characters + 4 ASCII = 76 bytes, past the 72-byte ceiling,
    // even though the string is only 40 UTF-16 code units long.
    const password = 'ü'.repeat(36) + 'aB1!';
    expect(password.length).toBeLessThan(PASSWORD_MAX_LENGTH);
    expect(passwordByteLength(password)).toBeGreaterThan(PASSWORD_MAX_LENGTH);
    expect(evaluatePasswordStrength(password).rules.length).toBe(false);
  });
});

describe('passwordIssue', () => {
  it('returns null for an acceptable password', () => {
    expect(passwordIssue('SecurePass123!')).toBeNull();
  });

  it('reports length before complexity', () => {
    // Too short *and* missing classes — the length problem is the actionable one.
    expect(passwordIssue('abc')).toBe('tooShort');
  });

  it('distinguishes too long from too short', () => {
    expect(passwordIssue('aB1!' + 'x'.repeat(PASSWORD_MAX_LENGTH))).toBe('tooLong');
  });

  it('reports tooWeak when only a character class is missing', () => {
    expect(passwordIssue('Abcdefghij12')).toBe('tooWeak');
  });
});
