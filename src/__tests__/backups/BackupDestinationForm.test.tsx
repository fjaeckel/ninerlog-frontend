import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BackupDestinationForm from '../../components/backups/BackupDestinationForm';
import * as useBackupsHook from '../../hooks/useBackups';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const s3Provider = {
  name: 's3',
  displayName: 'Amazon S3',
  description: 'S3-compatible buckets',
  configSchema: {
    fields: [
      { name: 'bucket', label: 'Bucket', type: 'string', required: true },
      { name: 'region', label: 'Region', type: 'region', required: true },
      { name: 'prefix', label: 'Prefix', type: 'string', required: false },
      { name: 'endpoint', label: 'Endpoint URL', type: 'url', required: false },
    ],
  },
  credentialSchema: {
    fields: [
      { name: 'access_key_id', label: 'Access key ID', type: 'string', required: true },
      { name: 'secret_access_key', label: 'Secret access key', type: 'password', required: true },
    ],
  },
};

describe('BackupDestinationForm', () => {
  const mockCreate = { mutateAsync: vi.fn(), isPending: false };
  const mockUpdate = { mutateAsync: vi.fn(), isPending: false };
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useBackupsHook, 'useBackupProviders').mockReturnValue({
      data: [s3Provider],
      isLoading: false,
      error: null,
    } as any);
    vi.spyOn(useBackupsHook, 'useCreateBackupDestination').mockReturnValue(mockCreate as any);
    vi.spyOn(useBackupsHook, 'useUpdateBackupDestination').mockReturnValue(mockUpdate as any);
  });

  it('renders provider fields dynamically from the schema', async () => {
    renderWithProviders(<BackupDestinationForm onClose={onClose} />);

    await waitFor(() => expect(screen.getByLabelText(/display name/i)).toBeInTheDocument());

    expect(screen.getByLabelText(/^Bucket/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Region/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Prefix$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Endpoint URL/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Access key ID/)).toBeInTheDocument();

    const secret = screen.getByLabelText(/Secret access key/);
    expect(secret).toHaveAttribute('type', 'password');
  });

  it('submits a new destination with config and credentials', async () => {
    const user = userEvent.setup();
    mockCreate.mutateAsync.mockResolvedValueOnce({});

    renderWithProviders(<BackupDestinationForm onClose={onClose} />);

    await user.type(screen.getByLabelText(/display name/i), 'My S3 backup');
    await user.type(screen.getByLabelText(/^Bucket/), 'my-bucket');
    await user.type(screen.getByLabelText(/^Region/), 'us-east-1');
    await user.type(screen.getByLabelText(/Access key ID/), 'AKIAEXAMPLE');
    await user.type(screen.getByLabelText(/Secret access key/), 'sekret');

    await user.click(screen.getByRole('button', { name: /create destination/i }));

    await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalledTimes(1));

    const payload = mockCreate.mutateAsync.mock.calls[0][0];
    expect(payload.provider).toBe('s3');
    expect(payload.displayName).toBe('My S3 backup');
    expect(payload.config).toEqual({ bucket: 'my-bucket', region: 'us-east-1' });
    expect(payload.credentials).toEqual({
      access_key_id: 'AKIAEXAMPLE',
      secret_access_key: 'sekret',
    });
    expect(payload.schedule).toBe('manual');
    expect(payload.enabled).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows day-of-week selector only when weekly schedule is chosen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BackupDestinationForm onClose={onClose} />);

    expect(screen.queryByLabelText(/day of week/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/cadence/i), 'weekly');

    expect(screen.getByLabelText(/day of week/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/day of month/i)).not.toBeInTheDocument();
  });
});
