import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../../pages/auth/LoginPage';
import * as useAuthHook from '../../hooks/useAuth';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
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
  });

  it('renders login form', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByText('PilotLog')).toBeInTheDocument();
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
      response: { data: { message: 'Invalid credentials' } },
    });
    
    renderWithProviders(<LoginPage />);
    
    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('navigates to register page', () => {
    renderWithProviders(<LoginPage />);
    
    const registerLink = screen.getByText(/create one/i);
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});
