import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from '../../pages/ProfilePage';
import * as notificationsHook from '../../hooks/useNotifications';
import { useAuthStore } from '../../stores/authStore';

const mutate = vi.fn();

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

const prefs = (enabledCategories: string[]) =>
  vi.spyOn(notificationsHook, 'useNotificationPreferences').mockReturnValue({
    data: { emailEnabled: true, enabledCategories, warningDays: [30, 14, 7], checkHour: 8 },
    isLoading: false,
  } as never);

describe('Notification categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'pilot@example.com', name: 'Mehmet', createdAt: '', updatedAt: '' },
      isAuthenticated: true,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresIn: 900,
    });
    vi.spyOn(notificationsHook, 'useUpdateNotificationPreferences').mockReturnValue({ mutate, isPending: false } as never);
    vi.spyOn(notificationsHook, 'useNotificationHistory').mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
    } as never);
  });

  it('switches aircraft reminder emails off', async () => {
    prefs(['credential_medical', 'aircraft_reminder']);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    const toggle = screen.getByRole('checkbox', { name: /Aircraft reminders/ });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(mutate).toHaveBeenCalledWith({ enabledCategories: ['credential_medical'] });
  });

  it('switches aircraft reminder emails on', async () => {
    prefs(['credential_medical']);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    const toggle = screen.getByRole('checkbox', { name: /Aircraft reminders/ });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(mutate).toHaveBeenCalledWith({ enabledCategories: ['credential_medical', 'aircraft_reminder'] });
  });
});
