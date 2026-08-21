import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UpdateIndicator } from '../../components/layout/UpdateIndicator';

let updateStatus: unknown = {};

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: vi.fn(async () => ({ data: updateStatus, error: undefined })),
  },
}));

let queryClient: QueryClient;

const renderIndicator = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UpdateIndicator />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const behind = {
  checkEnabled: true,
  updateAvailable: true,
  branch: 'main',
  lastCheckedAt: '2026-08-20T06:00:00Z',
  components: [
    {
      name: 'api',
      currentVersion: 'v1.3.4',
      latestVersion: 'v1.3.5',
      state: 'update_available',
      channel: 'release',
      releaseUrl: 'https://github.com/fjaeckel/ninerlog-api/releases/tag/v1.3.5',
      publishedAt: '2026-08-18T20:32:52Z',
    },
    {
      name: 'frontend',
      currentVersion: 'latest',
      currentCommit: 'a1b2c3d',
      state: 'update_available',
      channel: 'commit',
      behindBy: 7,
      compareUrl: 'https://github.com/fjaeckel/ninerlog-frontend/compare/a1b2c3d...main',
    },
  ],
};

beforeEach(() => {
  updateStatus = {};
});

afterEach(() => {
  cleanup();
  queryClient?.clear();
  vi.clearAllMocks();
});

describe('UpdateIndicator', () => {
  it('lights up when a component is behind its newest release', async () => {
    updateStatus = behind;
    renderIndicator();

    expect(await screen.findByRole('button', { name: /an update is available/i })).toBeInTheDocument();
  });

  it('names every component behind, with its release link, once opened', async () => {
    updateStatus = behind;
    const user = userEvent.setup();
    renderIndicator();

    await user.click(await screen.findByRole('button', { name: /an update is available/i }));

    const panel = screen.getByRole('status');
    expect(panel).toHaveTextContent('v1.3.4');
    expect(panel).toHaveTextContent('v1.3.5');
    expect(panel).toHaveTextContent(/7 commits behind main/i);
    expect(screen.getByRole('link', { name: /release notes/i })).toHaveAttribute(
      'href',
      'https://github.com/fjaeckel/ninerlog-api/releases/tag/v1.3.5'
    );
    expect(screen.getByRole('link', { name: /view changes/i })).toHaveAttribute(
      'href',
      'https://github.com/fjaeckel/ninerlog-frontend/compare/a1b2c3d...main'
    );
    expect(screen.getByRole('link', { name: /admin console/i })).toHaveAttribute('href', '/admin');
  });

  it('opens on hover and closes again on leave', async () => {
    updateStatus = behind;
    const user = userEvent.setup();
    renderIndicator();

    const light = await screen.findByRole('button', { name: /an update is available/i });
    await user.hover(light);
    expect(screen.getByRole('status')).toBeInTheDocument();

    await user.unhover(light);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    updateStatus = behind;
    const user = userEvent.setup();
    renderIndicator();

    await user.click(await screen.findByRole('button', { name: /an update is available/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('closes when the next tap lands elsewhere', async () => {
    updateStatus = behind;
    const user = userEvent.setup();
    renderIndicator();

    await user.click(await screen.findByRole('button', { name: /an update is available/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('stays dark when every component is current', async () => {
    updateStatus = {
      checkEnabled: true,
      updateAvailable: false,
      branch: 'main',
      components: [
        { name: 'api', currentVersion: 'v1.3.5', state: 'up_to_date', channel: 'release' },
        { name: 'frontend', currentVersion: 'v1.3.2', state: 'up_to_date', channel: 'release' },
      ],
    };
    const { container } = renderIndicator();

    await vi.waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(container).toBeEmptyDOMElement();
  });

  it('stays dark when the check is switched off', async () => {
    updateStatus = {
      checkEnabled: false,
      updateAvailable: false,
      components: [
        { name: 'api', currentVersion: 'v1.3.4', state: 'unknown' },
        { name: 'frontend', currentVersion: 'dev', state: 'unknown' },
      ],
    };
    const { container } = renderIndicator();

    await vi.waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(container).toBeEmptyDOMElement();
  });
});
