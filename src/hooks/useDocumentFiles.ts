import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

export type DocumentFile = components['schemas']['DocumentFile'];

/** Which kind of document a file hangs off. */
export type DocumentSubject = 'license' | 'credential';


/** Whether a stored file is a raster image the client can render itself. */
export const isImageFile = (file: Pick<DocumentFile, 'contentType'>): boolean =>
  file.contentType === 'image/jpeg' || file.contentType === 'image/png';

export const documentFilesKey = (subject: DocumentSubject, subjectId: string) =>
  ['documentFiles', subject, subjectId] as const;

const documentFileBlobKey = (subject: DocumentSubject, subjectId: string, fileId: string) =>
  ['documentFileBlob', subject, subjectId, fileId] as const;

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
  // Generated body type describes the parts, not their FormData encoding.
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

/** How long a document's file list stays fresh. */
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
 * An object URL for one image's bytes, fetched with the bearer token.
 * The URL is revoked when it changes or the consumer unmounts.
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

/** Downloads a file to disk as an explicit user action. */
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
