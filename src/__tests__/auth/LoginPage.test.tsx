import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../../pages/auth/LoginPage';
import * as useAuthHook from '../../hooks/useAuth';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

const localProviders = {
  mode: 'local',
  passwordLoginEnabled: true,
  registrationEnabled: true,
  twoFactorEnabled: true,
  webauthnEnabled: true,
  oidc: { enabled: false },
};

const oidcProviders = {
  mode: 'oidc',
  passwordLoginEnabled: false,
  registrationEnabled: false,
  twoFactorEnabled: false,
  webauthnEnabled: false,
  oidc: { enabled: true, name: 'Authentik', authorizeUrl: '/api/v1/auth/oidc/authorize' },
};

describe('LoginPage', () => {
  const mockLogin = {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAuthHook, 'useLogin').mockReturnValue(mockLogin as any);
    vi.spyOn(useAuthHook, 'useAuthProviders').mockReturnValue({
      data: localProviders,
      isPending: false,
      isError: false,
    } as any);
  });

  it('renders login form', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByText('NinerLog')).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows validation errors for invalid input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockResolvedValueOnce({});
    
    renderWithProviders(<LoginPage />);
    
    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    
    await waitFor(() => {
      expect(mockLogin.mutateAsync).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockRejectedValueOnce({
      error: 'Invalid credentials',
    });
    
    renderWithProviders(<LoginPage />);
    
    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('displays rate limit message on 429', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockRejectedValueOnce({
      error: 'Too many requests, please try again later',
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
    });
  });

  it('displays disabled account message', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockRejectedValueOnce({
      error: 'Account disabled. Contact the administrator.',
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/account disabled/i)).toBeInTheDocument();
    });
  });

  it('displays locked account message', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockRejectedValueOnce({
      error: 'Account temporarily locked due to too many failed login attempts. Please try again later.',
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/locked/i)).toBeInTheDocument();
    });
  });

  it('tells an unverified user their account is on a deletion clock', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockRejectedValueOnce({
      code: 'email_not_verified',
      error: 'Email address not verified.',
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/^email/i), 'unverified@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    const banner = await screen.findByTestId('email-not-verified-banner');
    // Someone coming back later to find they still cannot log in is exactly
    // who needs to know the account will not wait forever.
    expect(banner).toHaveTextContent(/deleted after 30 days/i);
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('navigates to register page', () => {
    renderWithProviders(<LoginPage />);

    const registerLink = screen.getByText(/create one/i);
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('shows a loading state while the capability probe is pending', () => {
    vi.spyOn(useAuthHook, 'useAuthProviders').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as any);

    renderWithProviders(<LoginPage />);

    expect(screen.getByText(/checking sign-in options/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('falls back to the password form when the probe fails', () => {
    vi.spyOn(useAuthHook, 'useAuthProviders').mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as any);

    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  describe('OIDC mode', () => {
    beforeEach(() => {
      vi.spyOn(useAuthHook, 'useAuthProviders').mockReturnValue({
        data: oidcProviders,
        isPending: false,
        isError: false,
      } as any);
    });

    it('renders only the SSO button, no password form or register link', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByRole('button', { name: /sign in with authentik/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/create one/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/sign in with passkey/i)).not.toBeInTheDocument();
    });

    it('navigates to the authorize URL on click', async () => {
      const user = userEvent.setup();
      const assign = vi.fn();
      const original = window.location.assign;
      window.location.assign = assign;
      try {
        renderWithProviders(<LoginPage />);
        await user.click(screen.getByRole('button', { name: /sign in with authentik/i }));
        expect(assign).toHaveBeenCalledWith('/api/v1/auth/oidc/authorize');
      } finally {
        window.location.assign = original;
      }
    });
  });
});
