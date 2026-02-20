import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HelpPage from '../../pages/help/HelpPage';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('HelpPage', () => {
  it('renders Help Base title', () => {
    renderWithProviders(<HelpPage />);
    expect(screen.getByText('Help Base')).toBeInTheDocument();
  });

  it('shows Getting Started content by default', () => {
    renderWithProviders(<HelpPage />);
    expect(screen.getByText('Getting Started with NinerLog')).toBeInTheDocument();
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
  });

  it('renders all topic navigation buttons', () => {
    renderWithProviders(<HelpPage />);
    // Check that the nav sidebar contains all sections
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map(b => b.textContent?.trim());
    expect(labels).toContain('Getting Started');
    expect(labels).toContain('Aircraft');
    expect(labels).toContain('Logging Flights');
    expect(labels).toContain('Import & Export');
    expect(labels).toContain('Currency & Recency');
    expect(labels).toContain('Admin Console');
  });

  it('navigates to Aircraft topic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpPage />);

    const buttons = screen.getAllByRole('button');
    const aircraftBtn = buttons.find(b => b.textContent?.trim() === 'Aircraft');
    await user.click(aircraftBtn!);

    expect(screen.getByText('Aircraft Management')).toBeInTheDocument();
    expect(screen.getByText(/adding an aircraft/i)).toBeInTheDocument();
  });

  it('navigates to Licenses topic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpPage />);

    const buttons = screen.getAllByRole('button');
    const btn = buttons.find(b => b.textContent?.includes('Licenses'));
    await user.click(btn!);

    expect(screen.getByText(/understanding the model/i)).toBeInTheDocument();
  });

  it('navigates to Flights topic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpPage />);

    const buttons = screen.getAllByRole('button');
    const btn = buttons.find(b => b.textContent?.includes('Logging Flights'));
    await user.click(btn!);

    expect(screen.getByText(/auto-calculated fields/i)).toBeInTheDocument();
  });

  it('navigates to Currency topic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpPage />);

    const buttons = screen.getAllByRole('button');
    const btn = buttons.find(b => b.textContent?.includes('Currency'));
    await user.click(btn!);

    expect(screen.getByText(/EASA Rules/i)).toBeInTheDocument();
    expect(screen.getByText(/FAA Rules/i)).toBeInTheDocument();
  });

  it('navigates to Import & Export topic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpPage />);

    const buttons = screen.getAllByRole('button');
    const btn = buttons.find(b => b.textContent?.includes('Import'));
    await user.click(btn!);

    expect(screen.getByText(/foreflight csv/i)).toBeInTheDocument();
  });

  it('navigates to Credentials topic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpPage />);

    const buttons = screen.getAllByRole('button');
    const btn = buttons.find(b => b.textContent?.includes('Credentials'));
    await user.click(btn!);

    expect(screen.getByText(/expiry alerts/i)).toBeInTheDocument();
  });

  it('navigates to Admin topic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpPage />);

    const buttons = screen.getAllByRole('button');
    const btn = buttons.find(b => b.textContent?.includes('Admin'));
    await user.click(btn!);

    expect(screen.getByText(/ADMIN_EMAIL/)).toBeInTheDocument();
  });

  it('Getting Started covers complete onboarding flow', () => {
    renderWithProviders(<HelpPage />);
    // Verify the guide covers all essential steps
    expect(screen.getByText(/add your license/i)).toBeInTheDocument();
    expect(screen.getByText(/add your aircraft/i)).toBeInTheDocument();
    expect(screen.getByText(/log your first flight/i)).toBeInTheDocument();
    expect(screen.getByText(/check your currency/i)).toBeInTheDocument();
    expect(screen.getByText(/add your credentials/i)).toBeInTheDocument();
  });
});
