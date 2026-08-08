import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentImageStrip } from '../../components/documents/DocumentImageStrip';
import * as documentImageHooks from '../../hooks/useDocumentImages';
import * as featureHooks from '../../hooks/useFeatures';

const anImage = (id: string, caption?: string) => ({
  id,
  contentType: 'image/png' as const,
  byteSize: 2048,
  caption,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const renderStrip = (props: Partial<Parameters<typeof DocumentImageStrip>[0]> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentImageStrip subject="license" subjectId="lic-1" {...props} />
    </QueryClientProvider>
  );
};

function mockFeature(enabled = true) {
  vi.spyOn(featureHooks, 'useDocumentImagesFeature').mockReturnValue({
    enabled,
    maxBytes: 5 * 1024 * 1024,
    maxPerDocument: 5,
    allowedContentTypes: ['image/jpeg', 'image/png'],
    isLoading: false,
  });
}

function mockImages(images: ReturnType<typeof anImage>[] | undefined) {
  vi.spyOn(documentImageHooks, 'useDocumentImages').mockReturnValue({
    data: images,
    isLoading: false,
  } as never);
}

describe('DocumentImageStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeature();
    mockImages([anImage('a', 'Front page')]);
    vi.spyOn(documentImageHooks, 'useDocumentImageUrl').mockReturnValue({
      data: 'blob:thumb',
      isLoading: false,
      isError: false,
    } as never);
  });

  // The whole point of this component: photos were previously invisible from
  // the list, so a card with photos must now say so.
  it('shows a thumbnail on a document that has photos', () => {
    renderStrip();
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view full size/i })).toBeInTheDocument();
  });

  it('renders nothing when the document has no photos', () => {
    mockImages([]);
    const { container } = renderStrip();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the list is still unknown', () => {
    mockImages(undefined);
    const { container } = renderStrip();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the server has the feature switched off', () => {
    mockFeature(false);
    mockImages([anImage('a')]);
    const { container } = renderStrip();
    expect(container).toBeEmptyDOMElement();
  });

  // Each visible thumbnail is its own authenticated request, and this renders
  // once per card — so the strip must not fan out with the photo count.
  it('caps the thumbnails and counts the rest', () => {
    mockImages([anImage('a'), anImage('b'), anImage('c'), anImage('d')]);
    renderStrip();

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('honours an explicit cap', () => {
    mockImages([anImage('a'), anImage('b'), anImage('c')]);
    renderStrip({ max: 1 });

    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows no counter when everything fits', () => {
    mockImages([anImage('a'), anImage('b')]);
    renderStrip();

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('opens the full-size preview when a thumbnail is clicked', async () => {
    const user = userEvent.setup();
    renderStrip();

    await user.click(screen.getByRole('button', { name: /view full size/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Front page' })).toBeInTheDocument();
  });

  // It is a read-only peek — uploading and deleting stay in the edit form, so
  // no destructive control may appear on a list card.
  it('offers no upload or delete control', () => {
    mockImages([anImage('a')]);
    renderStrip();

    expect(screen.queryByRole('button', { name: /add photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete photo/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-image-input')).not.toBeInTheDocument();
  });
});
