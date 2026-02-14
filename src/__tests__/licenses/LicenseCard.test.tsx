import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LicenseCard from '../../components/licenses/LicenseCard';
import { License } from '../../stores/licenseStore';

describe('LicenseCard', () => {
  const mockLicense: License = {
    id: '123',
    userId: 'user-123',
    licenseType: 'EASA_PPL',
    licenseNumber: 'PPL-12345',
    issueDate: '2024-01-01',
    expiryDate: '2026-01-01',
    issuingAuthority: 'EASA',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  it('renders license information', () => {
    render(
      <LicenseCard
        license={mockLicense}
        isDefault={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText('EASA PPL')).toBeInTheDocument();
    expect(screen.getByText('PPL-12345')).toBeInTheDocument();
    expect(screen.getByText('EASA')).toBeInTheDocument();
    expect(screen.getByText('Default', { selector: 'span.badge-info' })).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <LicenseCard
        license={mockLicense}
        isDefault={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <LicenseCard
        license={mockLicense}
        isDefault={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('shows expired warning for expired licenses', () => {
    const expiredLicense = {
      ...mockLicense,
      expiryDate: '2020-01-01',
    };
    
    render(
      <LicenseCard
        license={expiredLicense}
        isDefault={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });

  it('shows expiring soon warning', () => {
    const expiringLicense = {
      ...mockLicense,
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    
    render(
      <LicenseCard
        license={expiringLicense}
        isDefault={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    
    expect(screen.getByText(/expiring/i)).toBeInTheDocument();
  });
});
