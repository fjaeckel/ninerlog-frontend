import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AircraftPage from '../../pages/aircraft/AircraftPage';
import * as useAircraftHook from '../../hooks/useAircraft';

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

describe('AircraftPage', () => {
  const mockDelete = { mutateAsync: vi.fn(), isPending: false };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAircraftHook, 'useDeleteAircraft').mockReturnValue(mockDelete as any);
    // Also mock the hooks used by AircraftForm (loaded inside modal)
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue({
      mutateAsync: vi.fn(), isPending: false,
    } as any);
    vi.spyOn(useAircraftHook, 'useUpdateAircraft').mockReturnValue({
      mutateAsync: vi.fn(), isPending: false,
    } as any);
    vi.spyOn(useAircraftHook, 'useAircraftById').mockReturnValue({
      data: undefined, isLoading: false, error: null,
    } as any);
  });

  it('renders empty state when no aircraft', () => {
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [], isLoading: false, error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    expect(screen.getByText(/no aircraft added yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first aircraft/i })).toBeInTheDocument();
  });

  it('renders loading state', () => {
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: undefined, isLoading: true, error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders aircraft cards', () => {
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [
        {
          id: 'ac-1',
          userId: 'user-1',
          registration: 'D-EFGH',
          type: 'C172',
          make: 'Cessna',
          model: '172 Skyhawk',
          category: 'SEP',
          engineType: 'piston',
          isComplex: false,
          isHighPerformance: false,
          isTailwheel: false,
          isActive: true,
          notes: null,
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-02-01T14:30:00Z',
        },
        {
          id: 'ac-2',
          userId: 'user-1',
          registration: 'N12345',
          type: 'PA28R',
          make: 'Piper',
          model: 'Arrow',
          category: 'SEP',
          engineType: 'piston',
          isComplex: true,
          isHighPerformance: true,
          isTailwheel: false,
          isActive: true,
          notes: 'Checkout required',
          createdAt: '2026-01-20T10:00:00Z',
          updatedAt: '2026-02-01T14:30:00Z',
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    // Check first aircraft card
    expect(screen.getByText('D-EFGH')).toBeInTheDocument();
    expect(screen.getByText('Cessna 172 Skyhawk')).toBeInTheDocument();

    // Check second aircraft card
    expect(screen.getByText('N12345')).toBeInTheDocument();
    expect(screen.getByText('Piper Arrow')).toBeInTheDocument();
    expect(screen.getByText('Checkout required')).toBeInTheDocument();
  });

  it('displays characteristic badges', () => {
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [
        {
          id: 'ac-1',
          userId: 'user-1',
          registration: 'D-EFGH',
          type: 'PA28R',
          make: 'Piper',
          model: 'Arrow',
          isComplex: true,
          isHighPerformance: true,
          isTailwheel: true,
          isActive: true,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('High Perf')).toBeInTheDocument();
    expect(screen.getByText('Tailwheel')).toBeInTheDocument();
  });

  it('displays active/inactive status', () => {
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [
        {
          id: 'ac-1',
          userId: 'user-1',
          registration: 'D-AAAA',
          type: 'C172',
          make: 'Cessna',
          model: '172',
          isComplex: false,
          isHighPerformance: false,
          isTailwheel: false,
          isActive: true,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'ac-2',
          userId: 'user-1',
          registration: 'D-BBBB',
          type: 'PA28',
          make: 'Piper',
          model: 'Cherokee',
          isComplex: false,
          isHighPerformance: false,
          isTailwheel: false,
          isActive: false,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('opens add aircraft form modal', async () => {
    const user = userEvent.setup();
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [], isLoading: false, error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    await user.click(screen.getByRole('button', { name: /add your first aircraft/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/registration/i)).toBeInTheDocument();
    });
  });

  it('opens edit modal for existing aircraft', async () => {
    const user = userEvent.setup();
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [
        {
          id: 'ac-1',
          userId: 'user-1',
          registration: 'D-EFGH',
          type: 'C172',
          make: 'Cessna',
          model: '172 Skyhawk',
          isComplex: false,
          isHighPerformance: false,
          isTailwheel: false,
          isActive: true,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByText('Edit Aircraft')).toBeInTheDocument();
    });
  });

  it('calls delete with confirmation', async () => {
    const user = userEvent.setup();
    mockDelete.mutateAsync.mockResolvedValueOnce(undefined);

    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [
        {
          id: 'ac-1',
          userId: 'user-1',
          registration: 'D-EFGH',
          type: 'C172',
          make: 'Cessna',
          model: '172',
          isComplex: false,
          isHighPerformance: false,
          isTailwheel: false,
          isActive: true,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    // Click the delete button on the card
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // ConfirmDialog should appear
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Delete aircraft?')).toBeInTheDocument();

    // Click the confirm button in the dialog
    const dialog = screen.getByRole('alertdialog');
    const confirmBtn = dialog.querySelector('button.btn-danger') as HTMLElement;
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete.mutateAsync).toHaveBeenCalledWith('ac-1');
    });
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [
        {
          id: 'ac-1',
          userId: 'user-1',
          registration: 'D-EFGH',
          type: 'C172',
          make: 'Cessna',
          model: '172',
          isComplex: false,
          isHighPerformance: false,
          isTailwheel: false,
          isActive: true,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    // Click the delete button on the card
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // ConfirmDialog should appear
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // Click cancel in the dialog
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockDelete.mutateAsync).not.toHaveBeenCalled();
  });

  it('displays engine type label', () => {
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [
        {
          id: 'ac-1',
          userId: 'user-1',
          registration: 'D-EFGH',
          type: 'C172',
          make: 'Cessna',
          model: '172',
          engineType: 'piston',
          isComplex: false,
          isHighPerformance: false,
          isTailwheel: false,
          isActive: true,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    expect(screen.getByText('Piston')).toBeInTheDocument();
  });

  it('renders page title and subtitle', () => {
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({
      data: [], isLoading: false, error: null,
    } as any);

    renderWithProviders(<AircraftPage />);

    expect(screen.getByText('Aircraft')).toBeInTheDocument();
    expect(screen.getByText(/manage your fleet/i)).toBeInTheDocument();
  });
});
