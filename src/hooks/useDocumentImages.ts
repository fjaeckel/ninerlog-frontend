import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type DocumentImage = components['schemas']['DocumentImage'];

/** Which kind of document an image hangs off. */
export type DocumentSubject = 'license' | 'credential';

export const documentImagesKey = (subject: DocumentSubject, subjectId: string) =>
  ['documentImages', subject, subjectId] as const;

const documentImageBlobKey = (subject: DocumentSubject, subjectId: string, imageId: string) =>
  ['documentImageBlob', subject, subjectId, imageId] as const;

// Licences and credentials have separate URLs, and openapi-fetch types each
// path literally, so the branch below is what buys the type checking — a
// templated path string would erase it.

async function fetchImages(subject: DocumentSubject, subjectId: string): Promise<DocumentImage[]> {
  if (subject === 'license') {
    const { data, error } = await apiClient.GET('/licenses/{licenseId}/images', {
      params: { path: { licenseId: subjectId } },
    });
    if (error) throw error;
    return data as DocumentImage[];
  }
  const { data, error } = await apiClient.GET('/credentials/{credentialId}/images', {
    params: { path: { credentialId: subjectId } },
  });
  if (error) throw error;
  return data as DocumentImage[];
}

async function postImage(subject: DocumentSubject, subjectId: string, form: FormData): Promise<DocumentImage> {
  // openapi-fetch passes a FormData body through untouched and lets the
  // browser set the multipart boundary, so the upload still goes through the
  // shared client and inherits its auth header and 401-refresh retry. The
  // cast is only needed because the generated body type describes the parts,
  // not their FormData encoding.
  const body = form as unknown as components['schemas']['DocumentImageUpload'];

  if (subject === 'license') {
    const { data, error } = await apiClient.POST('/licenses/{licenseId}/images', {
      params: { path: { licenseId: subjectId } },
      body,
    });
    if (error) throw error;
    return data as DocumentImage;
  }
  const { data, error } = await apiClient.POST('/credentials/{credentialId}/images', {
    params: { path: { credentialId: subjectId } },
    body,
  });
  if (error) throw error;
  return data as DocumentImage;
}

async function deleteImage(subject: DocumentSubject, subjectId: string, imageId: string): Promise<void> {
  if (subject === 'license') {
    const { error } = await apiClient.DELETE('/licenses/{licenseId}/images/{imageId}', {
      params: { path: { licenseId: subjectId, imageId } },
    });
    if (error) throw error;
    return;
  }
  const { error } = await apiClient.DELETE('/credentials/{credentialId}/images/{imageId}', {
    params: { path: { credentialId: subjectId, imageId } },
  });
  if (error) throw error;
}

async function fetchImageBlob(subject: DocumentSubject, subjectId: string, imageId: string): Promise<Blob> {
  if (subject === 'license') {
    const { data, error } = await apiClient.GET('/licenses/{licenseId}/images/{imageId}', {
      params: { path: { licenseId: subjectId, imageId } },
      parseAs: 'blob',
    });
    if (error) throw error;
    return data as Blob;
  }
  const { data, error } = await apiClient.GET('/credentials/{credentialId}/images/{imageId}', {
    params: { path: { credentialId: subjectId, imageId } },
    parseAs: 'blob',
  });
  if (error) throw error;
  return data as Blob;
}

/**
 * How long a document's image list stays fresh.
 *
 * The global default is `staleTime: 0` with `refetchOnMount` and
 * `refetchOnWindowFocus`, which is wrong for this query now that a strip
 * renders on every licence and credential card: one visit to the list page
 * would re-list images for *every* card, and again on every tab refocus. The
 * `/images` routes share the tight per-user rate-limit bucket, so a pilot with
 * a handful of documents would burn through it just by navigating.
 *
 * Deferring is safe because it never delays the user's own edits — uploading
 * and deleting both invalidate this key, and invalidation overrides staleTime.
 * What it defers is a change made in another tab or on another device.
 */
export const DOCUMENT_IMAGES_STALE_TIME_MS = 60_000;

/** Metadata for a document's images. The bytes are fetched per image. */
export const useDocumentImages = (subject: DocumentSubject, subjectId: string | null | undefined, enabled = true) => {
  return useQuery({
    queryKey: documentImagesKey(subject, subjectId ?? ''),
    queryFn: () => fetchImages(subject, subjectId as string),
    enabled: enabled && !!subjectId,
    staleTime: DOCUMENT_IMAGES_STALE_TIME_MS,
  });
};

export const useUploadDocumentImage = (subject: DocumentSubject, subjectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }): Promise<DocumentImage> => {
      const form = new FormData();
      form.append('file', file);
      if (caption) form.append('caption', caption);
      return postImage(subject, subjectId, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentImagesKey(subject, subjectId) });
    },
  });
};

export const useDeleteDocumentImage = (subject: DocumentSubject, subjectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => deleteImage(subject, subjectId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentImagesKey(subject, subjectId) });
    },
  });
};

/**
 * An object URL for one image's bytes.
 *
 * The download is authenticated like every other call, so a plain `<img src>`
 * pointing at the API would 401 — the bytes have to be fetched with the
 * bearer token and handed to the browser as a blob. The URL is revoked when it
 * changes or the consumer unmounts; `gcTime: 0` keeps a revoked URL from being
 * replayed out of the cache to a later mount.
 */
export const useDocumentImageUrl = (
  subject: DocumentSubject,
  subjectId: string | null | undefined,
  imageId: string | null | undefined
) => {
  const query = useQuery({
    queryKey: documentImageBlobKey(subject, subjectId ?? '', imageId ?? ''),
    queryFn: async (): Promise<string> => {
      const blob = await fetchImageBlob(subject, subjectId as string, imageId as string);
      return URL.createObjectURL(blob);
    },
    enabled: !!subjectId && !!imageId,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  const url = query.data;
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return query;
};
