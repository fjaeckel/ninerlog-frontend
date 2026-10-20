import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LicenceCountryPrompt } from '../../components/logbook/LicenceCountryPrompt';
import { COUNTRY_PROMPT_KEY } from '../../lib/logbookPrompts';
import type { License } from '../../types/api';

const licence = (id: string, issuingCountry: string | null): License => ({
  id, userId: 'u', regulatoryAuthority: 'EASA', licenseType: `PPL-${id}`, licenseNumber: 'n',
  issueDate: '2020-01-01', issuingAuthority: 'LBA', requiresSeparateLogbook: false, issuingCountry,
  createdAt: '', updatedAt: '',
});

describe('LicenceCountryPrompt', () => {
  beforeEach(() => localStorage.removeItem(COUNTRY_PROMPT_KEY));

  it('offers to add a country to each licence without one', async () => {
    const onAdd = vi.fn();
    render(<LicenceCountryPrompt licences={[licence('a', 'DE'), licence('b', null)]} onAddCountry={onAdd} />);
    expect(screen.queryByRole('button', { name: /ppl-a/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add country to easa ppl-b/i }));
    expect(onAdd).toHaveBeenCalledWith('b');
  });

  it('stays dismissed per licence, and comes back for a new one', async () => {
    const { rerender } = render(<LicenceCountryPrompt licences={[licence('b', null)]} onAddCountry={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText(/add the issuing country/i)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(COUNTRY_PROMPT_KEY) ?? '[]')).toEqual(['b']);

    rerender(<LicenceCountryPrompt licences={[licence('b', null), licence('c', null)]} onAddCountry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /easa ppl-c/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /easa ppl-b/i })).not.toBeInTheDocument();
  });

  it('says that a country requiring it switches strict logbook mode on', () => {
    render(<LicenceCountryPrompt licences={[licence('b', null)]} onAddCountry={vi.fn()} />);
    expect(screen.getByText(/\(e\.g\. switzerland, germany\) switches strict logbook mode on/i)).toBeInTheDocument();
  });

  it('renders nothing when every licence has a country', () => {
    const { container } = render(<LicenceCountryPrompt licences={[licence('a', 'CH')]} onAddCountry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reads the dismissed list from storage once, not per licence or render', () => {
    localStorage.setItem(COUNTRY_PROMPT_KEY, JSON.stringify(['a']));
    const getItem = vi.spyOn(localStorage, 'getItem');
    const licences = [licence('a', null), licence('b', null), licence('c', null)];
    const { rerender } = render(<LicenceCountryPrompt licences={licences} onAddCountry={vi.fn()} />);
    rerender(<LicenceCountryPrompt licences={[...licences]} onAddCountry={vi.fn()} />);
    rerender(<LicenceCountryPrompt licences={[...licences]} onAddCountry={vi.fn()} />);

    const reads = getItem.mock.calls.filter(([key]) => key === COUNTRY_PROMPT_KEY).length;
    getItem.mockRestore();
    expect(reads).toBe(1);
    expect(screen.queryByRole('button', { name: /ppl-a/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ppl-b/i })).toBeInTheDocument();
  });

  it('still renders when storage is unavailable', () => {
    const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<LicenceCountryPrompt licences={[licence('b', null)]} onAddCountry={vi.fn()} />);
    getItem.mockRestore();
    expect(screen.getByRole('button', { name: /ppl-b/i })).toBeInTheDocument();
  });
});
