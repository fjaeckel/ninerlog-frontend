import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link, useNavigate, useSearchParams } from 'react-router';
import { ScrollToTop } from '../../components/layout/ScrollToTop';

/** A list that can open a detail page and rewrite its own query string. */
function List() {
  const [, setSearchParams] = useSearchParams();
  return (
    <>
      <Link to="/flights/1">open flight</Link>
      <button onClick={() => setSearchParams({ q: 'night' }, { replace: true })}>filter</button>
    </>
  );
}

function Detail() {
  const navigate = useNavigate();
  // A real Back, not a link — this is the POP the browser would issue
  return <button onClick={() => navigate(-1)}>back</button>;
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/flights']}>
      <ScrollToTop />
      <Routes>
        <Route path="/flights" element={<List />} />
        <Route path="/flights/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ScrollToTop', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
  });

  it('starts a newly opened page at the top', async () => {
    const user = userEvent.setup();
    renderApp();
    scrollTo.mockClear();

    await user.click(screen.getByText('open flight'));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('jumps rather than glides, since scroll-smooth is global', async () => {
    const user = userEvent.setup();
    renderApp();
    scrollTo.mockClear();

    await user.click(screen.getByText('open flight'));

    expect(scrollTo.mock.calls[0][0]).toMatchObject({ behavior: 'instant' });
  });

  it('leaves the page alone when the list only rewrites its query string', async () => {
    const user = userEvent.setup();
    renderApp();
    scrollTo.mockClear();

    // Typing a search or changing a filter must not yank the list to the top
    await user.click(screen.getByText('filter'));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leaves going back alone, so the list keeps your place', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('open flight'));
    scrollTo.mockClear();

    await user.click(screen.getByText('back'));
    await screen.findByText('open flight');

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
