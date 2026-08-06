import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OidcCallbackPage from '../../pages/auth/OidcCallbackPage';
import * as useAuthHook from '../../hooks/useAuth';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderAt = (url: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <OidcCallbackPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('OidcCallbackPage', () => {
  const mockExchange = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAuthHook, 'useExchangeOidcCode').mockReturnValue(mockExchange as any);
  });

  it('exchanges the handoff code and navigates to the dashboard', async () => {
    mockExchange.mutateAsync.mockResolvedValueOnce({});

    renderAt('/auth/callback?oidc_code=one-time-code');

    expect(screen.getByText(/completing sign-in/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockExchange.mutateAsync).toHaveBeenCalledWith('one-time-code');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('shows an error when the exchange fails', async () => {
    mockExchange.mutateAsync.mockRejectedValueOnce({ error: 'expired' });

    renderAt('/auth/callback?oidc_code=stale-code');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign-in failed/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/back to sign-in/i)).toHaveAttribute('href', '/login');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows the translated message for a known oidc_error code', () => {
    renderAt('/auth/callback?oidc_error=email_conflict');

    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    expect(mockExchange.mutateAsync).not.toHaveBeenCalled();
  });

  it('falls back to a generic message for an unknown error code', () => {
    renderAt('/auth/callback?oidc_error=something_new');

    expect(screen.getByText(/sign-in failed\. please try again/i)).toBeInTheDocument();
  });

  it('redirects home when called without parameters', () => {
    renderAt('/auth/callback');

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    expect(mockExchange.mutateAsync).not.toHaveBeenCalled();
  });
});
