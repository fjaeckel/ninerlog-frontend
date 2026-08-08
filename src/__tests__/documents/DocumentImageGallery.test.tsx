import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentImageGallery } from '../../components/documents/DocumentImageGallery';
import * as documentImageHooks from '../../hooks/useDocumentImages';
import * as featureHooks from '../../hooks/useFeatures';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PER_DOCUMENT = 5;

const anImage = (id: string, caption?: string) => ({
  id,
  contentType: 'image/png' as const,
  byteSize: 2048,
  caption,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const renderGallery = (subjectId: string | null = 'lic-1') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentImageGallery subject="license" subjectId={subjectId} />
    </QueryClientProvider>
  );
};

const mockUpload = { mutateAsync: vi.fn(), isPending: false };
const mockDelete = { mutateAsync: vi.fn(), isPending: false };

function mockFeature(overrides: Partial<ReturnType<typeof featureHooks.useDocumentImagesFeature>> = {}) {
  vi.spyOn(featureHooks, 'useDocumentImagesFeature').mockReturnValue({
    enabled: true,
    maxBytes: MAX_BYTES,
    maxPerDocument: MAX_PER_DOCUMENT,
    allowedContentTypes: ['image/jpeg', 'image/png'],
    isLoading: false,
    ...overrides,
  });
}

function mockImages(images: ReturnType<typeof anImage>[]) {
  vi.spyOn(documentImageHooks, 'useDocumentImages').mockReturnValue({
    data: images,
    isLoading: false,
  } as never);
}

describe('DocumentImageGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeature();
    mockImages([]);
    vi.spyOn(documentImageHooks, 'useUploadDocumentImage').mockReturnValue(mockUpload as never);
    vi.spyOn(documentImageHooks, 'useDeleteDocumentImage').mockReturnValue(mockDelete as never);
    vi.spyOn(documentImageHooks, 'useDocumentImageUrl').mockReturnValue({
      data: 'blob:preview',
      isLoading: false,
      isError: false,
    } as never);
  });

  // The kill switch has to reach the UI: an operator who turned the feature
  // off should not see an upload control that can only produce a 403.
  it('renders nothing when the server has the feature switched off', () => {
    mockFeature({ enabled: false });
    const { container } = renderGallery();
    expect(container).toBeEmptyDOMElement();
  });

  it('tells the user to save first when the record does not exist yet', () => {
    renderGallery(null);
    expect(screen.getByText(/save the record first/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add photo/i })).not.toBeInTheDocument();
  });

  it('shows the stored photos and how many slots are used', () => {
    mockImages([anImage('a', 'Front page'), anImage('b')]);
    renderGallery();

    expect(screen.getByText('Front page')).toBeInTheDocument();
    expect(screen.getByText(`2 of ${MAX_PER_DOCUMENT}`)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('uploads a valid file', async () => {
    const user = userEvent.setup();
    renderGallery();

    const file = new File(['x'], 'front.png', { type: 'image/png' });
    await user.upload(screen.getByTestId('document-image-input'), file);

    await waitFor(() => expect(mockUpload.mutateAsync).toHaveBeenCalledWith({ file }));
  });

  // Both limits are advertised by GET /features. Checking them here means an
  // obviously doomed 5 MB upload is not sent just to be refused.
  it('rejects an oversized file without sending it', async () => {
    const user = userEvent.setup();
    renderGallery();

    const tooBig = new File([''], 'huge.png', { type: 'image/png' });
    Object.defineProperty(tooBig, 'size', { value: MAX_BYTES + 1 });
    await user.upload(screen.getByTestId('document-image-input'), tooBig);

    expect(await screen.findByRole('alert')).toHaveTextContent(/limit is 5 MB/i);
    expect(mockUpload.mutateAsync).not.toHaveBeenCalled();
  });

  // The input's `accept` filter is a hint the OS picker is free to ignore, so
  // the check has to exist in JS too. fireEvent bypasses the filter the way a
  // picker that ignored it would.
  it('rejects an unsupported format without sending it', async () => {
    renderGallery();
    const input = screen.getByTestId('document-image-input');

    fireEvent.change(input, {
      target: { files: [new File(['<svg/>'], 'evil.svg', { type: 'image/svg+xml' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/only jpeg and png/i);
    expect(mockUpload.mutateAsync).not.toHaveBeenCalled();
  });

  it('disables uploading once the document is full', () => {
    mockImages(Array.from({ length: MAX_PER_DOCUMENT }, (_, i) => anImage(`img-${i}`)));
    renderGallery();

    expect(screen.getByRole('button', { name: /add photo/i })).toBeDisabled();
    expect(screen.getByText(/maximum of 5 photos/i)).toBeInTheDocument();
  });

  it('surfaces a server rejection', async () => {
    const user = userEvent.setup();
    mockUpload.mutateAsync.mockRejectedValueOnce({ error: 'Image exceeds the maximum size of 5 MB' });
    renderGallery();

    await user.upload(
      screen.getByTestId('document-image-input'),
      new File(['x'], 'front.png', { type: 'image/png' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/exceeds the maximum size/i);
  });

  it('asks before deleting a photo', async () => {
    const user = userEvent.setup();
    mockImages([anImage('a')]);
    renderGallery();

    await user.click(screen.getByRole('button', { name: /delete photo/i }));
    expect(await screen.findByText(/cannot be undone/i)).toBeInTheDocument();
    expect(mockDelete.mutateAsync).not.toHaveBeenCalled();

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /delete photo/i }));
    await waitFor(() => expect(mockDelete.mutateAsync).toHaveBeenCalledWith('a'));
  });
});
