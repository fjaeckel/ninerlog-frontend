import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentFileGallery } from '../../components/documents/DocumentFileGallery';
import * as documentFileHooks from '../../hooks/useDocumentFiles';
import * as featureHooks from '../../hooks/useFeatures';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PER_DOCUMENT = 5;

const aFile = (id: string, caption?: string, contentType: 'image/png' | 'application/pdf' = 'image/png') => ({
  id,
  contentType,
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
      <DocumentFileGallery subject="license" subjectId={subjectId} />
    </QueryClientProvider>
  );
};

const mockUpload = { mutateAsync: vi.fn(), isPending: false };
const mockDelete = { mutateAsync: vi.fn(), isPending: false };
const mockDownload = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };

function mockFeature(overrides: Partial<ReturnType<typeof featureHooks.useDocumentFilesFeature>> = {}) {
  vi.spyOn(featureHooks, 'useDocumentFilesFeature').mockReturnValue({
    enabled: true,
    maxBytes: MAX_BYTES,
    maxPerDocument: MAX_PER_DOCUMENT,
    allowedContentTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    isLoading: false,
    ...overrides,
  });
}

function mockFiles(images: ReturnType<typeof aFile>[]) {
  vi.spyOn(documentFileHooks, 'useDocumentFiles').mockReturnValue({
    data: images,
    isLoading: false,
  } as never);
}

describe('DocumentFileGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeature();
    mockFiles([]);
    vi.spyOn(documentFileHooks, 'useUploadDocumentFile').mockReturnValue(mockUpload as never);
    vi.spyOn(documentFileHooks, 'useDeleteDocumentFile').mockReturnValue(mockDelete as never);
    vi.spyOn(documentFileHooks, 'useDownloadDocumentFile').mockReturnValue(mockDownload as never);
    vi.spyOn(documentFileHooks, 'useDocumentFileUrl').mockReturnValue({
      data: 'blob:preview',
      isLoading: false,
      isError: false,
    } as never);
  });

  // Feature off: no upload control rendered.
  it('renders nothing when the server has the feature switched off', () => {
    mockFeature({ enabled: false });
    const { container } = renderGallery();
    expect(container).toBeEmptyDOMElement();
  });

  it('tells the user to save first when the record does not exist yet', () => {
    renderGallery(null);
    expect(screen.getByText(/save the record first/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add file/i })).not.toBeInTheDocument();
  });

  it('shows the stored photos and how many slots are used', () => {
    mockFiles([aFile('a', 'Front page'), aFile('b')]);
    renderGallery();

    expect(screen.getByText('Front page')).toBeInTheDocument();
    expect(screen.getByText(`2 of ${MAX_PER_DOCUMENT}`)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('uploads a valid file', async () => {
    const user = userEvent.setup();
    renderGallery();

    const file = new File(['x'], 'front.png', { type: 'image/png' });
    await user.upload(screen.getByTestId('document-file-input'), file);

    await waitFor(() => expect(mockUpload.mutateAsync).toHaveBeenCalledWith({ file }));
  });

  // Files over the limits advertised by GET /features are rejected locally.
  it('rejects an oversized file without sending it', async () => {
    const user = userEvent.setup();
    renderGallery();

    const tooBig = new File([''], 'huge.png', { type: 'image/png' });
    Object.defineProperty(tooBig, 'size', { value: MAX_BYTES + 1 });
    await user.upload(screen.getByTestId('document-file-input'), tooBig);

    expect(await screen.findByRole('alert')).toHaveTextContent(/limit is 5 MB/i);
    expect(mockUpload.mutateAsync).not.toHaveBeenCalled();
  });

  // fireEvent bypasses the input's `accept` filter, exercising the JS check.
  it('rejects an unsupported format without sending it', async () => {
    renderGallery();
    const input = screen.getByTestId('document-file-input');

    fireEvent.change(input, {
      target: { files: [new File(['<svg/>'], 'evil.svg', { type: 'image/svg+xml' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/only jpeg, png and pdf/i);
    expect(mockUpload.mutateAsync).not.toHaveBeenCalled();
  });

  it('disables uploading once the document is full', () => {
    mockFiles(Array.from({ length: MAX_PER_DOCUMENT }, (_, i) => aFile(`img-${i}`)));
    renderGallery();

    expect(screen.getByRole('button', { name: /add file/i })).toBeDisabled();
    expect(screen.getByText(/maximum of 5 files/i)).toBeInTheDocument();
  });

  it('surfaces a server rejection', async () => {
    const user = userEvent.setup();
    mockUpload.mutateAsync.mockRejectedValueOnce({ error: 'Image exceeds the maximum size of 5 MB' });
    renderGallery();

    await user.upload(
      screen.getByTestId('document-file-input'),
      new File(['x'], 'front.png', { type: 'image/png' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/exceeds the maximum size/i);
  });


  // A PDF: no blob fetch, no preview, download only.
  describe('PDFs', () => {
    it('shows an icon tile and never fetches the bytes', () => {
      const blobUrl = vi.spyOn(documentFileHooks, 'useDocumentFileUrl');
      mockFiles([aFile('a', 'Official scan', 'application/pdf')]);
      renderGallery();

      expect(screen.getByTestId('document-file-icon')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      // Hook called with a null id: disabled, no request.
      expect(blobUrl).toHaveBeenCalledWith('license', 'lic-1', null);
    });

    it('offers no full-size preview for a PDF', async () => {
      const user = userEvent.setup();
      mockFiles([aFile('a', undefined, 'application/pdf')]);
      renderGallery();

      expect(screen.queryByRole('button', { name: /view full size/i })).not.toBeInTheDocument();
      // Download control rendered instead.
      await user.click(screen.getByRole('button', { name: /download file/i }));
      await waitFor(() => expect(mockDownload.mutate).toHaveBeenCalled());
    });

    it('still renders images alongside PDFs', () => {
      mockFiles([aFile('a', undefined, 'image/png'), aFile('b', undefined, 'application/pdf')]);
      renderGallery();

      expect(screen.getAllByRole('img')).toHaveLength(1);
      expect(screen.getByTestId('document-file-icon')).toBeInTheDocument();
    });
  });

  it('asks before deleting a file', async () => {
    const user = userEvent.setup();
    mockFiles([aFile('a')]);
    renderGallery();

    await user.click(screen.getByRole('button', { name: /delete file/i }));
    expect(await screen.findByText(/cannot be undone/i)).toBeInTheDocument();
    expect(mockDelete.mutateAsync).not.toHaveBeenCalled();

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /delete file/i }));
    await waitFor(() => expect(mockDelete.mutateAsync).toHaveBeenCalledWith('a'));
  });
});
