import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LicenseForm from '../../components/licenses/LicenseForm';
import * as useLicensesHook from '../../hooks/useLicenses';

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

describe('LicenseForm', () => {
  const mockCreate = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockUpdate = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useLicensesHook, 'useCreateLicense').mockReturnValue(mockCreate as any);
    vi.spyOn(useLicensesHook, 'useUpdateLicense').mockReturnValue(mockUpdate as any);
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
  });

  it('renders license form fields', () => {
    renderWithProviders(<LicenseForm onClose={mockOnClose} />);
    
    expect(screen.getByLabelText(/license type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/license number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issuing authority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issue date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LicenseForm onClose={mockOnClose} />);
    
    await user.click(screen.getByRole('button', { name: /add license/i }));
    
    await waitFor(() => {
      // Zod enum validation message for empty/invalid enum value
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      expect(screen.getByText(/license number is required/i)).toBeInTheDocument();
    });
  });

  it('submits new license with valid data', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});
    
    renderWithProviders(<LicenseForm onClose={mockOnClose} />);
    
    await user.selectOptions(screen.getByLabelText(/license type/i), 'EASA_PPL');
    await user.type(screen.getByLabelText(/license number/i), 'PPL-12345');
    await user.type(screen.getByLabelText(/issuing authority/i), 'EASA');
    await user.type(screen.getByLabelText(/issue date/i), '2024-01-01');
    
    await user.click(screen.getByRole('button', { name: /add license/i }));
    
    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith({
        licenseType: 'EASA_PPL',
        licenseNumber: 'PPL-12345',
        issuingAuthority: 'EASA',
        issueDate: '2024-01-01',
        expiryDate: null, // No expiry date provided
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('updates existing license', async () => {
    const user = userEvent.setup();
    const existingLicense = {
      id: '123',
      userId: 'user-123',
      licenseType: 'EASA_PPL' as const,
      licenseNumber: 'PPL-12345',
      issuingAuthority: 'EASA',
      issueDate: '2024-01-01',
      expiryDate: null,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({
      data: [existingLicense],
      isLoading: false,
      error: null,
    } as any);

    mockUpdate.mutateAsync.mockResolvedValueOnce({});
    
    renderWithProviders(<LicenseForm licenseId="123" onClose={mockOnClose} />);
    
    // Update only sends expiryDate and isActive per OpenAPI spec
    await user.type(screen.getByLabelText(/expiry date/i), '2026-01-01');
    await user.click(screen.getByRole('button', { name: /update license/i }));
    
    await waitFor(() => {
      expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({
        id: '123',
        data: {
          expiryDate: '2026-01-01',
        },
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
