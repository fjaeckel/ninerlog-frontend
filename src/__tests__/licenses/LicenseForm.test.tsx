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
    
    expect(screen.getByLabelText(/regulatory authority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/license type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/license number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issuing authority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issue date/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LicenseForm onClose={mockOnClose} />);
    
    await user.click(screen.getByRole('button', { name: /add license/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/regulatory authority is required/i)).toBeInTheDocument();
      expect(screen.getByText(/license number is required/i)).toBeInTheDocument();
    });
  });

  it('submits new license with valid data', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});
    
    renderWithProviders(<LicenseForm onClose={mockOnClose} />);
    
    await user.type(screen.getByLabelText(/regulatory authority/i), 'EASA');
    await user.type(screen.getByLabelText(/license type/i), 'PPL');
    await user.type(screen.getByLabelText(/license number/i), 'PPL-12345');
    await user.type(screen.getByLabelText(/issuing authority/i), 'LBA');
    await user.type(screen.getByLabelText(/issue date/i), '2024-01-01');
    
    await user.click(screen.getByRole('button', { name: /add license/i }));
    
    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith({
        regulatoryAuthority: 'EASA',
        licenseType: 'PPL',
        licenseNumber: 'PPL-12345',
        issuingAuthority: 'LBA',
        issueDate: '2024-01-01',
        requiresSeparateLogbook: false,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('updates existing license', async () => {
    const user = userEvent.setup();
    const existingLicense = {
      id: '123',
      userId: 'user-123',
      regulatoryAuthority: 'EASA',
      licenseType: 'PPL',
      licenseNumber: 'PPL-12345',
      issuingAuthority: 'LBA',
      issueDate: '2024-01-01',
      requiresSeparateLogbook: false,
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
    
    // Update the issuing authority field
    const issuingAuthorityInput = screen.getByLabelText(/issuing authority/i);
    await user.clear(issuingAuthorityInput);
    await user.type(issuingAuthorityInput, 'EASA');
    await user.click(screen.getByRole('button', { name: /update license/i }));
    
    await waitFor(() => {
      expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({
        id: '123',
        data: expect.objectContaining({
          regulatoryAuthority: 'EASA',
          licenseType: 'PPL',
          licenseNumber: 'PPL-12345',
          issuingAuthority: 'EASA',
          requiresSeparateLogbook: false,
        }),
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
