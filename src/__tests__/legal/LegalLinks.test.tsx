import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LegalLinks } from '../../components/ui/LegalLinks';
import RegisterPage from '../../pages/auth/RegisterPage';
import * as useAuthHook from '../../hooks/useAuth';

const config = vi.hoisted(() => ({ LEGAL_DOCS: [] as string[] }));

vi.mock('../../lib/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/config')>();
  return {
    ...actual,
    get LEGAL_DOCS() {
      return config.LEGAL_DOCS;
    },
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('LegalLinks', () => {
  it('renders nothing when no documents are configured', () => {
    config.LEGAL_DOCS = [];
    const { container } = renderWithProviders(<LegalLinks />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links each configured document', () => {
    config.LEGAL_DOCS = ['terms', 'privacy'];
    renderWithProviders(<LegalLinks />);
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/legal/terms');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/legal/privacy');
  });
});

describe('RegisterPage legal notice', () => {
  beforeEach(() => {
    vi.spyOn(useAuthHook, 'useRegister').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
    vi.spyOn(useAuthHook, 'useResendVerification').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
    vi.spyOn(useAuthHook, 'useAuthProviders').mockReturnValue({
      data: { mode: 'local', registrationEnabled: true, oidc: { enabled: false } },
      isPending: false,
    } as any);
  });

  it('is absent without documents', () => {
    config.LEGAL_DOCS = [];
    renderWithProviders(<RegisterPage />);
    expect(screen.queryByTestId('legal-notice')).not.toBeInTheDocument();
  });

  it('names both documents when both are published', () => {
    config.LEGAL_DOCS = ['terms', 'privacy'];
    renderWithProviders(<RegisterPage />);
    const notice = screen.getByTestId('legal-notice');
    expect(notice).toHaveTextContent('By creating an account you agree to the Terms of Service and acknowledge the Privacy Policy.');
    expect(screen.getAllByRole('link', { name: 'Terms of Service' })[0]).toHaveAttribute('href', '/legal/terms');
  });

  it('names only the terms when the policy is not published', () => {
    config.LEGAL_DOCS = ['terms'];
    renderWithProviders(<RegisterPage />);
    expect(screen.getByTestId('legal-notice')).toHaveTextContent('By creating an account you agree to the Terms of Service.');
    expect(screen.queryByRole('link', { name: 'Privacy Policy' })).not.toBeInTheDocument();
  });
});
