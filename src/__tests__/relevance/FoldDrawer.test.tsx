import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { FoldDrawer, FoldScope, Folded } from '../../components/relevance/FoldDrawer';
import { Relevant } from '../../components/relevance/Relevant';
import type { FeatureId } from '../../lib/relevance';
import * as useRelevanceModule from '../../lib/relevance/useRelevance';

const renderInRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('FoldDrawer', () => {
  it('renders nothing when nothing is folded', () => {
    renderInRouter(
      <FoldDrawer>
        <p>Always here</p>
      </FoldDrawer>,
    );
    expect(screen.getByText('Always here')).toBeInTheDocument();
    expect(screen.queryByTestId('fold-drawer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More/ })).not.toBeInTheDocument();
  });

  it('counts folded children and renders them inline when opened', async () => {
    renderInRouter(
      <FoldDrawer>
        <p>Primary field</p>
        <Folded reason="Folded because none of its toolkits is on: IFR">
          <label>
            IFR time <input defaultValue="0:30" />
          </label>
        </Folded>
        <Folded>
          <p>Examiner</p>
        </Folded>
      </FoldDrawer>,
    );

    const more = screen.getByRole('button', { name: 'More (2)' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Examiner')).not.toBeInTheDocument();

    await userEvent.click(more);

    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('IFR time')).toHaveValue('0:30');
    expect(screen.getByText('Examiner')).toBeInTheDocument();
    expect(screen.getByText(/serve toolkits you don't use/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change in What I fly' })).toHaveAttribute('href', '/profile');
  });

  it('places the drawer where <FoldDrawer /> sits inside a scope', async () => {
    renderInRouter(
      <FoldScope>
        <Folded>
          <p>Relief time</p>
        </Folded>
        <footer>
          <FoldDrawer label={(n) => `Other (${n})`} explain={false} />
        </footer>
      </FoldScope>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Other (1)' }));
    expect(screen.getByRole('contentinfo')).toContainElement(screen.getByText('Relief time'));
    expect(screen.queryByText(/serve toolkits you don't use/)).not.toBeInTheDocument();
  });

  it('renders folded content in place when there is no drawer (never hidden)', () => {
    renderInRouter(
      <Folded>
        <p>Launch method</p>
      </Folded>,
    );
    expect(screen.getByText('Launch method')).toBeInTheDocument();
  });
});

describe('Relevant', () => {
  it('renders children in place when visible and folds them otherwise', async () => {
    const spy = vi.spyOn(useRelevanceModule, 'useRelevance');
    spy.mockImplementation((id) =>
      id === ('shown' as FeatureId)
        ? { visible: true, folded: false }
        : { visible: false, folded: true, reason: 'Folded because none of its toolkits is on: IFR' },
    );

    renderInRouter(
      <FoldDrawer>
        <Relevant id={'shown' as FeatureId}>
          <p>Launch method</p>
        </Relevant>
        <Relevant id={'folded' as FeatureId}>
          <p>Approaches</p>
        </Relevant>
      </FoldDrawer>,
    );

    expect(screen.getByText('Launch method')).toBeInTheDocument();
    expect(screen.queryByText('Approaches')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More (1)' }));
    const folded = screen.getByText('Approaches');
    expect(folded.parentElement).toHaveAttribute('data-relevance-reason', 'Folded because none of its toolkits is on: IFR');
    spy.mockRestore();
  });
});
