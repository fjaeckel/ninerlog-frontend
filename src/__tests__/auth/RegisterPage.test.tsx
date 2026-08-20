import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from '../../pages/auth/RegisterPage';
import * as useAuthHook from '../../hooks/useAuth';
import i18n from '../../i18n';

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

describe('RegisterPage', () => {
  const mockRegister = {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
  const mockResendVerification = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAuthHook, 'useRegister').mockReturnValue(mockRegister as any);
    vi.spyOn(useAuthHook, 'useResendVerification').mockReturnValue(mockResendVerification as any);
  });

  afterEach(() => {
    void i18n.changeLanguage('en');
  });

  it('renders registration form', () => {
    renderWithProviders(<RegisterPage />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('validates password matching', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1234!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password4567!');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('hides the strength meter until the user types a password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    expect(screen.queryByTestId('password-strength')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^password/i), 'a');
    expect(screen.getByTestId('password-strength')).toBeInTheDocument();
  });

  it('moves the strength meter red → amber → green as the password improves', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    const passwordInput = screen.getByLabelText(/^password/i);

    await user.type(passwordInput, 'abc');
    expect(screen.getByTestId('password-strength-level')).toHaveAttribute(
      'data-level',
      'weak',
    );

    await user.clear(passwordInput);
    await user.type(passwordInput, 'Abcdefghijkl');
    expect(screen.getByTestId('password-strength-level')).toHaveAttribute(
      'data-level',
      'fair',
    );

    await user.clear(passwordInput);
    await user.type(passwordInput, 'Abcdefghij1!');
    expect(screen.getByTestId('password-strength-level')).toHaveAttribute(
      'data-level',
      'strong',
    );
  });

  it('refuses to submit a long password that is missing a character class', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
    // 12 characters, but no special character.
    await user.type(screen.getByLabelText(/^password/i), 'Abcdefghij12');
    await user.type(screen.getByLabelText(/confirm password/i), 'Abcdefghij12');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/must include a lowercase letter/i)).toBeInTheDocument();
    });
    expect(mockRegister.mutateAsync).not.toHaveBeenCalled();
  });

  it('refuses to submit a password below the minimum length', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Abcdefghi1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Abcdefghi1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    });
    expect(mockRegister.mutateAsync).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockRegister.mutateAsync.mockResolvedValueOnce({});
    
    renderWithProviders(<RegisterPage />);
    
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1234!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1234!');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockRegister.mutateAsync).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'Password1234!',
        name: 'John Doe',
        preferredLocale: 'en',
      });
    });
  });

  it('displays error message on registration failure', async () => {
    const user = userEvent.setup();
    
    const error = new Error('Registration failed');
    (error as any).response = { data: { message: 'Email already exists' } };
    mockRegister.mutateAsync.mockRejectedValueOnce(error);
    
    renderWithProviders(<RegisterPage />);
    
    // Fill in all required fields.
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'Password1234!');
    await user.type(confirmPasswordInput, 'Password1234!');
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await screen.findByText(/email already exists/i);
  });

  it('submits the selected language as preferredLocale', async () => {
    const user = userEvent.setup();
    mockRegister.mutateAsync.mockResolvedValueOnce({});

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1234!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1234!');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.selectOptions(screen.getByLabelText(/language/i), 'de');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ preferredLocale: 'de' }),
      );
    });
  });

  it('shows check-email view when verification is required', async () => {
    const user = userEvent.setup();
    mockRegister.mutateAsync.mockResolvedValueOnce({
      email: 'pilot@example.com',
      verificationRequired: true,
      message: 'verification required',
    });

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'A Pilot');
    await user.type(screen.getByLabelText(/^email/i), 'pilot@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1234!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1234!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByTestId('check-email-view')).toBeInTheDocument();
    });

    // The unverified-account deletion deadline is shown on the signup screen.
    expect(screen.getByText(/deleted after 30 days/i)).toBeInTheDocument();
  });

  it('does not mention the deletion deadline when no verification is needed', async () => {
    const user = userEvent.setup();
    mockRegister.mutateAsync.mockResolvedValueOnce({
      email: 'pilot@example.com',
      verificationRequired: false,
      message: 'account ready',
    });

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'A Pilot');
    await user.type(screen.getByLabelText(/^email/i), 'pilot@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1234!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1234!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('check-email-view')).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/deleted after 30 days/i)).not.toBeInTheDocument();
  });

  it('shows login-ready view when verification is not required', async () => {
    const user = userEvent.setup();
    mockRegister.mutateAsync.mockResolvedValueOnce({
      email: 'pilot@example.com',
      verificationRequired: false,
      message: 'account ready',
    });

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'A Pilot');
    await user.type(screen.getByLabelText(/^email/i), 'pilot@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password1234!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1234!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByTestId('login-ready-view')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /log in now/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { email: 'pilot@example.com' } });
  });
});
