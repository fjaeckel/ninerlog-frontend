import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LicenseCard from '../../components/licenses/LicenseCard';
import { License } from '../../stores/licenseStore';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('LicenseCard', () => {
  const mockLicense: License = {
    id: '123',
    userId: 'user-123',
    regulatoryAuthority: 'EASA',
    licenseType: 'PPL',
    licenseNumber: 'PPL-12345',
    issueDate: '2024-01-01',
    issuingAuthority: 'EASA',
    requiresSeparateLogbook: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  it('renders license information', () => {
    renderWithProviders(
      <LicenseCard
        license={mockLicense}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText('EASA PPL')).toBeInTheDocument();
    expect(screen.getByText('PPL-12345')).toBeInTheDocument();
    expect(screen.getAllByText('EASA').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LicenseCard
        license={mockLicense}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LicenseCard
        license={mockLicense}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('shows separate logbook badge when requiresSeparateLogbook is true', () => {
    const logbookLicense = {
      ...mockLicense,
      requiresSeparateLogbook: true,
    };
    
    renderWithProviders(
      <LicenseCard
        license={logbookLicense}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText('YES')).toBeInTheDocument();
  });
});
