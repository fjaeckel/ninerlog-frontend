import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CredentialForm from '../../components/credentials/CredentialForm';
import * as useCredentialsHook from '../../hooks/useCredentials';

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

describe('CredentialForm', () => {
  const mockCreate = { mutateAsync: vi.fn(), isPending: false };
  const mockUpdate = { mutateAsync: vi.fn(), isPending: false };
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useCredentialsHook, 'useCreateCredential').mockReturnValue(mockCreate as any);
    vi.spyOn(useCredentialsHook, 'useUpdateCredential').mockReturnValue(mockUpdate as any);
    vi.spyOn(useCredentialsHook, 'useCredential').mockReturnValue({
      data: undefined, isLoading: false, error: null,
    } as any);
  });

  it('renders all form fields', () => {
    renderWithProviders(<CredentialForm onClose={mockOnClose} />);

    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issue date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/issuing authority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('renders all credential type options', () => {
    renderWithProviders(<CredentialForm onClose={mockOnClose} />);

    expect(screen.getByText('EASA Class 1 Medical')).toBeInTheDocument();
    expect(screen.getByText('FAA Class 3 Medical')).toBeInTheDocument();
    expect(screen.getByText('Language Proficiency ICAO Level 4')).toBeInTheDocument();
    expect(screen.getByText(/ZÜP/)).toBeInTheDocument();
    expect(screen.getByText(/ZüBB/)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CredentialForm onClose={mockOnClose} />);

    // Clear issue date (has default)
    await user.clear(screen.getByLabelText(/issue date/i));

    fireEvent.submit(screen.getByRole('button', { name: /add credential/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/credential type is required/i)).toBeInTheDocument();
    });
  });

  it('submits new credential with valid data', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});

    renderWithProviders(<CredentialForm onClose={mockOnClose} />);

    await user.selectOptions(screen.getByLabelText(/type/i), 'EASA_CLASS2_MEDICAL');
    await user.type(screen.getByLabelText(/number/i), 'MED-001');
    await user.clear(screen.getByLabelText(/issue date/i));
    await user.type(screen.getByLabelText(/issue date/i), '2026-01-15');
    fireEvent.change(screen.getByLabelText(/expiry date/i), { target: { value: '2027-01-15' } });
    await user.type(screen.getByLabelText(/issuing authority/i), 'EASA AME Dr. Smith');

    fireEvent.submit(screen.getByRole('button', { name: /add credential/i }).closest('form')!);

    await waitFor(() => {
      expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          credentialType: 'EASA_CLASS2_MEDICAL',
          credentialNumber: 'MED-001',
          issuingAuthority: 'EASA AME Dr. Smith',
        })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('populates form when editing', async () => {
    const existingCredential = {
      id: 'cred-1',
      userId: 'user-1',
      credentialType: 'FAA_CLASS3_MEDICAL' as const,
      credentialNumber: 'FAA-2026-001',
      issueDate: '2026-01-10',
      expiryDate: '2028-01-10',
      issuingAuthority: 'FAA AME',
      notes: 'Annual check',
      createdAt: '2026-01-10T00:00:00Z',
      updatedAt: '2026-01-10T00:00:00Z',
    };

    vi.spyOn(useCredentialsHook, 'useCredential').mockReturnValue({
      data: existingCredential, isLoading: false, error: null,
    } as any);

    renderWithProviders(<CredentialForm credentialId="cred-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/issuing authority/i)).toHaveValue('FAA AME');
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CredentialForm onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
