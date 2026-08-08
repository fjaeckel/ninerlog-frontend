import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type DocumentFile = components['schemas']['DocumentFile'];

/** Which kind of document a file hangs off. */
export type DocumentSubject = 'license' | 'credential';


/**
 * Whether a stored file is a raster image the client can render itself.
 *
 * Mirrors the server's own split: images were verified by decoding their
 * header and are served inline; anything else (today: PDF) was not, is served
 * as an attachment, and must never be rendered inside this origin.
 */
export const isImageFile = (file: Pick<DocumentFile, 'contentType'>): boolean =>
  file.contentType === 'image/jpeg' || file.contentType === 'image/png';

export const documentFilesKey = (subject: DocumentSubject, subjectId: string) =>
  ['documentFiles', subject, subjectId] as const;

const documentFileBlobKey = (subject: DocumentSubject, subjectId: string, fileId: string) =>
  ['documentFileBlob', subject, subjectId, fileId] as const;

// Licences and credentials have separate URLs, and openapi-fetch types each
// path literally, so the branch below is what buys the type checking — a
// templated path string would erase it.

async function fetchFiles(subject: DocumentSubject, subjectId: string): Promise<DocumentFile[]> {
  if (subject === 'license') {
    const { data, error } = await apiClient.GET('/licenses/{licenseId}/files', {
      params: { path: { licenseId: subjectId } },
    });
    if (error) throw error;
    return data as DocumentFile[];
  }
  const { data, error } = await apiClient.GET('/credentials/{credentialId}/files', {
    params: { path: { credentialId: subjectId } },
  });
  if (error) throw error;
  return data as DocumentFile[];
}

async function postFile(subject: DocumentSubject, subjectId: string, form: FormData): Promise<DocumentFile> {
  // openapi-fetch passes a FormData body through untouched and lets the
  // browser set the multipart boundary, so the upload still goes through the
  // shared client and inherits its auth header and 401-refresh retry. The
  // cast is only needed because the generated body type describes the parts,
  // not their FormData encoding.
  const body = form as unknown as components['schemas']['DocumentFileUpload'];

  if (subject === 'license') {
    const { data, error } = await apiClient.POST('/licenses/{licenseId}/files', {
      params: { path: { licenseId: subjectId } },
      body,
    });
    if (error) throw error;
    return data as DocumentFile;
  }
  const { data, error } = await apiClient.POST('/credentials/{credentialId}/files', {
    params: { path: { credentialId: subjectId } },
    body,
  });
  if (error) throw error;
  return data as DocumentFile;
}

async function deleteFile(subject: DocumentSubject, subjectId: string, fileId: string): Promise<void> {
  if (subject === 'license') {
    const { error } = await apiClient.DELETE('/licenses/{licenseId}/files/{fileId}', {
      params: { path: { licenseId: subjectId, fileId } },
    });
    if (error) throw error;
    return;
  }
  const { error } = await apiClient.DELETE('/credentials/{credentialId}/files/{fileId}', {
    params: { path: { credentialId: subjectId, fileId } },
  });
  if (error) throw error;
}

async function fetchFileBlob(subject: DocumentSubject, subjectId: string, fileId: string): Promise<Blob> {
  if (subject === 'license') {
    const { data, error } = await apiClient.GET('/licenses/{licenseId}/files/{fileId}', {
      params: { path: { licenseId: subjectId, fileId } },
      parseAs: 'blob',
    });
    if (error) throw error;
    return data as Blob;
  }
  const { data, error } = await apiClient.GET('/credentials/{credentialId}/files/{fileId}', {
    params: { path: { credentialId: subjectId, fileId } },
    parseAs: 'blob',
  });
  if (error) throw error;
  return data as Blob;
}

/**
 * How long a document's file list stays fresh.
 *
 * The global default is `staleTime: 0` with `refetchOnMount` and
 * `refetchOnWindowFocus`, which is wrong for this query now that a strip
 * renders on every licence and credential card: one visit to the list page
 * would re-list files for *every* card, and again on every tab refocus. The
 * `/files` routes share the tight per-user rate-limit bucket, so a pilot with
 * a handful of documents would burn through it just by navigating.
 *
 * Deferring is safe because it never delays the user's own edits — uploading
 * and deleting both invalidate this key, and invalidation overrides staleTime.
 * What it defers is a change made in another tab or on another device.
 */
export const DOCUMENT_FILES_STALE_TIME_MS = 60_000;

/** Metadata for a document's files. The bytes are fetched per file. */
export const useDocumentFiles = (subject: DocumentSubject, subjectId: string | null | undefined, enabled = true) => {
  return useQuery({
    queryKey: documentFilesKey(subject, subjectId ?? ''),
    queryFn: () => fetchFiles(subject, subjectId as string),
    enabled: enabled && !!subjectId,
    staleTime: DOCUMENT_FILES_STALE_TIME_MS,
  });
};

export const useUploadDocumentFile = (subject: DocumentSubject, subjectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }): Promise<DocumentFile> => {
      const form = new FormData();
      form.append('file', file);
      if (caption) form.append('caption', caption);
      return postFile(subject, subjectId, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentFilesKey(subject, subjectId) });
    },
  });
};

export const useDeleteDocumentFile = (subject: DocumentSubject, subjectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => deleteFile(subject, subjectId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentFilesKey(subject, subjectId) });
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
export const useDocumentFileUrl = (
  subject: DocumentSubject,
  subjectId: string | null | undefined,
  fileId: string | null | undefined
) => {
  const query = useQuery({
    queryKey: documentFileBlobKey(subject, subjectId ?? '', fileId ?? ''),
    queryFn: async (): Promise<string> => {
      const blob = await fetchFileBlob(subject, subjectId as string, fileId as string);
      return URL.createObjectURL(blob);
    },
    enabled: !!subjectId && !!fileId,
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

/**
 * Downloads a file to disk as an explicit user action.
 *
 * This is the only path by which a non-image ever leaves the API, and it is
 * deliberately a download rather than a render: the server sends PDFs with
 * `Content-Disposition: attachment` so untrusted document bytes are never
 * rendered inside this origin, and the client honours that rather than
 * defeating it by piping the blob into an iframe.
 *
 * The fetch still goes through `apiClient`, so it carries the bearer token and
 * the 401-refresh retry like every other call. The object URL is revoked as
 * soon as the browser has taken the download.
 */
export const useDownloadDocumentFile = (subject: DocumentSubject, subjectId: string) => {
  return useMutation({
    mutationFn: async (file: DocumentFile): Promise<void> => {
      const blob = await fetchFileBlob(subject, subjectId, file.id);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename || 'document';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  });
};
