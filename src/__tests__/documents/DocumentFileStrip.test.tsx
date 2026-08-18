import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentFileStrip } from '../../components/documents/DocumentFileStrip';
import * as documentFileHooks from '../../hooks/useDocumentFiles';
import * as featureHooks from '../../hooks/useFeatures';

const aFile = (id: string, caption?: string, contentType: 'image/png' | 'application/pdf' = 'image/png') => ({
  id,
  contentType,
  byteSize: 2048,
  caption,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const renderStrip = (props: Partial<Parameters<typeof DocumentFileStrip>[0]> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentFileStrip subject="license" subjectId="lic-1" {...props} />
    </QueryClientProvider>
  );
};

function mockFeature(enabled = true) {
  vi.spyOn(featureHooks, 'useDocumentFilesFeature').mockReturnValue({
    enabled,
    maxBytes: 5 * 1024 * 1024,
    maxPerDocument: 5,
    allowedContentTypes: ['image/jpeg', 'image/png'],
    isLoading: false,
  });
}

function mockFiles(images: ReturnType<typeof aFile>[] | undefined) {
  vi.spyOn(documentFileHooks, 'useDocumentFiles').mockReturnValue({
    data: images,
    isLoading: false,
  } as never);
}

describe('DocumentFileStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeature();
    mockFiles([aFile('a', 'Front page')]);
    vi.spyOn(documentFileHooks, 'useDocumentFileUrl').mockReturnValue({
      data: 'blob:thumb',
      isLoading: false,
      isError: false,
    } as never);
  });

  // A card with photos shows the strip.
  it('shows a thumbnail on a document that has photos', () => {
    renderStrip();
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view full size/i })).toBeInTheDocument();
  });

  it('renders nothing when the document has no photos', () => {
    mockFiles([]);
    const { container } = renderStrip();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the list is still unknown', () => {
    mockFiles(undefined);
    const { container } = renderStrip();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the server has the feature switched off', () => {
    mockFeature(false);
    mockFiles([aFile('a')]);
    const { container } = renderStrip();
    expect(container).toBeEmptyDOMElement();
  });

  // Thumbnail requests are capped, independent of the photo count.
  it('caps the thumbnails and counts the rest', () => {
    mockFiles([aFile('a'), aFile('b'), aFile('c'), aFile('d')]);
    renderStrip();

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('honours an explicit cap', () => {
    mockFiles([aFile('a'), aFile('b'), aFile('c')]);
    renderStrip({ max: 1 });

    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows no counter when everything fits', () => {
    mockFiles([aFile('a'), aFile('b')]);
    renderStrip();

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });


  // A PDF on a card shows an icon, costs no request, and is not clickable.
  it('shows a PDF as an icon tile with no preview and no fetch', () => {
    const blobUrl = vi.spyOn(documentFileHooks, 'useDocumentFileUrl');
    mockFiles([aFile('a', 'Scan', 'application/pdf')]);
    renderStrip();

    expect(screen.getByTestId('document-file-icon')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view full size/i })).not.toBeInTheDocument();
    expect(blobUrl).toHaveBeenCalledWith('license', 'lic-1', null);
  });

  it('counts PDFs toward the strip like any other file', () => {
    mockFiles([
      aFile('a', undefined, 'application/pdf'),
      aFile('b', undefined, 'image/png'),
      aFile('c', undefined, 'application/pdf'),
    ]);
    renderStrip();

    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('opens the full-size preview when a thumbnail is clicked', async () => {
    const user = userEvent.setup();
    renderStrip();

    await user.click(screen.getByRole('button', { name: /view full size/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Front page' })).toBeInTheDocument();
  });

  // No destructive control on a list card.
  it('offers no upload or delete control', () => {
    mockFiles([aFile('a')]);
    renderStrip();

    expect(screen.queryByRole('button', { name: /add photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete photo/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-file-input')).not.toBeInTheDocument();
  });
});
