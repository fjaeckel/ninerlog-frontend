import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import FlightSearchBar from '../../components/flights/FlightSearchBar';
import { SEARCH_TAGS, suggestTags } from '../../lib/flightSearchTags';
import enFlights from '../../i18n/locales/en/flights.json';
import deFlights from '../../i18n/locales/de/flights.json';

describe('flightSearchTags catalog', () => {
  it('suggests tags by prefix on name and alias', () => {
    const byName = suggestTags('night').map((t) => t.name);
    expect(byName).toContain('nightTime');

    const byAlias = suggestTags('xc').map((t) => t.name);
    expect(byAlias).toContain('crossCountryTime');
  });

  it('ranks prefix matches before substring matches', () => {
    const results = suggestTags('land').map((t) => t.name);
    expect(results[0]).toBe('landings');
  });

  it('returns nothing for an empty word', () => {
    expect(suggestTags('')).toEqual([]);
  });

  it('has a translated description for every tag in every locale', () => {
    for (const locale of [enFlights, deFlights]) {
      const tags = (locale as { searchTags: Record<string, string> }).searchTags;
      for (const tag of SEARCH_TAGS) {
        expect(tags[tag.name], `missing searchTags.${tag.name}`).toBeTruthy();
      }
    }
  });

  it('has unique names and aliases', () => {
    const seen = new Set<string>();
    for (const tag of SEARCH_TAGS) {
      for (const name of [tag.name, ...(tag.aliases ?? [])]) {
        expect(seen.has(name.toLowerCase()), `duplicate tag ${name}`).toBe(false);
        seen.add(name.toLowerCase());
      }
    }
  });
});

// Stateful wrapper so typing behaves like in the real (controlled) usage.
function Harness({ onChange, initial = '', error }: { onChange?: (v: string) => void; initial?: string; error?: string | null }) {
  const [value, setValue] = useState(initial);
  return (
    <FlightSearchBar
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      error={error}
    />
  );
}

describe('FlightSearchBar', () => {
  it('shows tag suggestions while typing and inserts the tag on click', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Harness onChange={handleChange} />);

    await user.type(screen.getByRole('combobox'), 'nigh');

    const option = await screen.findByText('nightTime:');
    await user.click(option);
    expect(handleChange).toHaveBeenLastCalledWith('nightTime:');
  });

  it('does not suggest tags while typing a value', async () => {
    const user = userEvent.setup();
    render(<Harness initial="nightTime:" />);

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{End}30');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('accepts the highlighted suggestion with Enter', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Harness onChange={handleChange} />);

    await user.type(screen.getByRole('combobox'), 'xc');
    await screen.findByRole('listbox');
    await user.keyboard('{Enter}');
    expect(handleChange).toHaveBeenLastCalledWith('crossCountryTime:');
  });

  it('renders a server parse error', () => {
    render(<Harness initial="date:oops" error="Invalid search query: date" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid search query: date');
  });

  it('opens the tag browser with every tag listed', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Harness onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: /search syntax/i }));
    for (const tag of SEARCH_TAGS) {
      expect(screen.getByRole('button', { name: tag.name })).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'nightTime' }));
    expect(handleChange).toHaveBeenLastCalledWith('nightTime:');
  });
});
