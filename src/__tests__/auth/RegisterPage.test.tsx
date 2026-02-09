import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from '../../pages/auth/RegisterPage';
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

describe('RegisterPage', () => {
  const mockRegister = {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAuthHook, 'useRegister').mockReturnValue(mockRegister as any);
  });

  it('renders registration form', () => {
    renderWithProviders(<RegisterPage />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('validates password matching', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'password1234');
    await user.type(screen.getByLabelText(/confirm password/i), 'password4567');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockRegister.mutateAsync.mockResolvedValueOnce({});
    
    renderWithProviders(<RegisterPage />);
    
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/^email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'password1234');
    await user.type(screen.getByLabelText(/confirm password/i), 'password1234');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockRegister.mutateAsync).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password1234',
        name: 'John Doe',
      });
    });
  });

  it('displays error message on registration failure', async () => {
    const user = userEvent.setup();
    
    // Set up the mock to reject with an error
    const error = new Error('Registration failed');
    (error as any).response = { data: { message: 'Email already exists' } };
    mockRegister.mutateAsync.mockRejectedValueOnce(error);
    
    renderWithProviders(<RegisterPage />);
    
    // Fill in all required fields (name is now required per OpenAPI spec)
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/^email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password1234');
    await user.type(confirmPasswordInput, 'password1234');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    // The error should appear after async mutation rejection
    await screen.findByText(/email already exists/i);
  });
});
