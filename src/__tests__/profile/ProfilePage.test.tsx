import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from '../../pages/ProfilePage';
import * as useProfileHook from '../../hooks/useProfile';
import { useAuthStore } from '../../stores/authStore';

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

describe('ProfilePage', () => {
  const mockUpdateProfile = { mutateAsync: vi.fn(), isPending: false };
  const mockChangePassword = { mutateAsync: vi.fn(), isPending: false };
  const mockDeleteAccount = { mutateAsync: vi.fn(), isPending: false };
  const mockDeleteAllFlights = { mutateAsync: vi.fn(), isPending: false };
  const mockDeleteAllUserData = { mutateAsync: vi.fn(), isPending: false };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'pilot@example.com', name: 'John Doe', createdAt: '', updatedAt: '' },
      isAuthenticated: true,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresIn: 900,
    });
    vi.spyOn(useProfileHook, 'useUpdateProfile').mockReturnValue(mockUpdateProfile as any);
    vi.spyOn(useProfileHook, 'useChangePassword').mockReturnValue(mockChangePassword as any);
    vi.spyOn(useProfileHook, 'useDeleteAccount').mockReturnValue(mockDeleteAccount as any);
    vi.spyOn(useProfileHook, 'useDeleteAllFlights').mockReturnValue(mockDeleteAllFlights as any);
    vi.spyOn(useProfileHook, 'useDeleteAllUserData').mockReturnValue(mockDeleteAllUserData as any);
  });

  it('renders all profile sections', () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('populates profile form with current user data', () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByLabelText(/^name$/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('pilot@example.com');
  });

  it('submits profile update', async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mutateAsync.mockResolvedValueOnce({
      id: 'user-1', email: 'new@example.com', name: 'Jane Doe', createdAt: '', updatedAt: '',
    });

    renderWithProviders(<ProfilePage />);

    await user.clear(screen.getByLabelText(/^name$/i));
    await user.type(screen.getByLabelText(/^name$/i), 'Jane Doe');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateProfile.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jane Doe' })
      );
    });
  });

  it('submits password change', async () => {
    const user = userEvent.setup();
    mockChangePassword.mutateAsync.mockResolvedValueOnce(undefined);

    renderWithProviders(<ProfilePage />);

    await user.type(screen.getByLabelText(/current password/i), 'oldpass123');
    await user.type(screen.getByLabelText(/^new password$/i), 'newpass456');
    await user.type(screen.getByLabelText(/confirm new password/i), 'newpass456');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(mockChangePassword.mutateAsync).toHaveBeenCalledWith({
        currentPassword: 'oldpass123',
        newPassword: 'newpass456',
      });
    });
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.type(screen.getByLabelText(/current password/i), 'oldpass123');
    await user.type(screen.getByLabelText(/^new password$/i), 'newpass456');
    await user.type(screen.getByLabelText(/confirm new password/i), 'different');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mockChangePassword.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows delete confirmation when button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: /delete account/i }));

    expect(screen.getByText(/enter your password to confirm/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /permanently delete account/i })).toBeInTheDocument();
  });

  it('cancels delete confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: /delete account/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByText(/enter your password to confirm/i)).not.toBeInTheDocument();
  });

  it('submits account deletion with password', async () => {
    const user = userEvent.setup();
    mockDeleteAccount.mutateAsync.mockResolvedValueOnce(undefined);

    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: /delete account/i }));
    await user.type(screen.getByLabelText(/confirm deletion password/i), 'mypassword');
    await user.click(screen.getByRole('button', { name: /permanently delete account/i }));

    await waitFor(() => {
      expect(mockDeleteAccount.mutateAsync).toHaveBeenCalledWith('mypassword');
    });
  });

  it('shows Delete All Flights button', () => {
    renderWithProviders(<ProfilePage />);
    expect(screen.getByRole('button', { name: /delete all flights/i })).toBeInTheDocument();
  });

  it('shows Delete All Data button', () => {
    renderWithProviders(<ProfilePage />);
    expect(screen.getByRole('button', { name: /delete all data/i })).toBeInTheDocument();
  });

  it('shows confirmation when Delete All Flights clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: /delete all flights/i }));

    expect(screen.getByText(/permanently delete all your flights/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /permanently delete all flights/i })).toBeInTheDocument();
  });

  it('calls deleteAllFlights and shows result', async () => {
    const user = userEvent.setup();
    mockDeleteAllFlights.mutateAsync.mockResolvedValueOnce({ deleted: 42 });

    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: /delete all flights/i }));
    await user.click(screen.getByRole('button', { name: /permanently delete all flights/i }));

    await waitFor(() => {
      expect(mockDeleteAllFlights.mutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/deleted 42 flights/i)).toBeInTheDocument();
    });
  });

  it('shows confirmation when Delete All Data clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: /delete all data/i }));

    expect(screen.getByText(/all your data.*only your account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /permanently delete all data/i })).toBeInTheDocument();
  });

  it('calls deleteAllUserData and shows result', async () => {
    const user = userEvent.setup();
    mockDeleteAllUserData.mutateAsync.mockResolvedValueOnce({ message: 'All user data deleted successfully' });

    renderWithProviders(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: /delete all data/i }));
    await user.click(screen.getByRole('button', { name: /permanently delete all data/i }));

    await waitFor(() => {
      expect(mockDeleteAllUserData.mutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/all data deleted successfully/i)).toBeInTheDocument();
    });
  });
});
