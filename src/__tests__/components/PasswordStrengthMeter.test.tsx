import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import i18n from '../../i18n';

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('PasswordStrengthMeter', () => {
  it('renders nothing for an empty password', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['abc', 'weak'],
    ['Abcdefghijkl', 'fair'],
    ['SecurePass123!', 'strong'],
  ])('reports %s as %s', (password, level) => {
    render(<PasswordStrengthMeter password={password} />);
    expect(screen.getByTestId('password-strength-level')).toHaveAttribute(
      'data-level',
      level,
    );
  });

  it('marks each rule met or unmet', () => {
    // Long enough, has upper/lower/digit — but no special character.
    render(<PasswordStrengthMeter password="Abcdefghij12" />);

    expect(screen.getByTestId('password-rule-length')).toHaveAttribute('data-met', 'true');
    expect(screen.getByTestId('password-rule-lowercase')).toHaveAttribute('data-met', 'true');
    expect(screen.getByTestId('password-rule-uppercase')).toHaveAttribute('data-met', 'true');
    expect(screen.getByTestId('password-rule-digit')).toHaveAttribute('data-met', 'true');
    expect(screen.getByTestId('password-rule-special')).toHaveAttribute('data-met', 'false');
  });

  it('exposes progress through the five rules to assistive tech', () => {
    render(<PasswordStrengthMeter password="Abcdefghij12" />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '4');
    expect(meter).toHaveAttribute('aria-valuemax', '5');
  });

  it('shows a human-readable level, not colour alone', () => {
    render(<PasswordStrengthMeter password="SecurePass123!" />);
    expect(screen.getByTestId('password-strength-level')).toHaveTextContent('Strong');
  });

  it('translates the level and rules', async () => {
    await i18n.changeLanguage('de');
    render(<PasswordStrengthMeter password="SecurePass123!" />);
    expect(screen.getByTestId('password-strength-level')).toHaveTextContent('Stark');
    expect(screen.getByTestId('password-rule-special')).toHaveTextContent('Sonderzeichen');
  });
});
