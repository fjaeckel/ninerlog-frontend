import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';
import type { components, operations } from '../api/schema';
import { invalidateFlightDependentQueries } from './invalidation';

type ImportUploadResponse = components['schemas']['ImportUploadResponse'];
type ImportPreviewResponse = components['schemas']['ImportPreviewResponse'];
type ImportResult = components['schemas']['ImportResult'];
type ImportColumnMapping = components['schemas']['ImportColumnMapping'];
type ImportJSONResult = components['schemas']['ImportJSONResult'];
type PaginatedImports = components['schemas']['PaginatedImports'];
type ImportTemplate = components['schemas']['ImportTemplate'];
type ImportField = components['schemas']['ImportField'];
type ImportTemplateList = components['schemas']['ImportTemplateList'];
type RestoreWarning = components['schemas']['RestoreWarning'];

export type {
  ImportUploadResponse,
  ImportPreviewResponse,
  ImportResult,
  ImportColumnMapping,
  ImportJSONResult,
  RestoreWarning,
  PaginatedImports,
  ImportTemplate,
  ImportField,
};

import { API_BASE_URL } from '../lib/config';

function getAuthHeaders() {
  const token = useAuthStore.getState().accessToken;
  return { Authorization: `Bearer ${token}` };
}

/** Past CSV imports, newest first. Confirm/restore invalidate ['imports']. */
export const useImportHistory = (page = 1, pageSize = 10) => {
  return useQuery({
    queryKey: ['imports', page, pageSize],
    queryFn: async (): Promise<PaginatedImports> => {
      const { data, error } = await apiClient.GET('/imports', {
        params: { query: { page, pageSize } },
      });
      if (error) throw error;
      return data as PaginatedImports;
    },
    placeholderData: keepPreviousData,
  });
};

/**
 * The catalogue of logbook formats the server can read, with per-source export
 * instructions.
 *
 * It is static configuration, identical for every user and changing only on
 * deploy, so it never goes stale within a session and is not worth refetching
 * on focus or remount.
 */
export const useImportTemplates = () => {
  return useQuery({
    queryKey: ['import-templates'],
    queryFn: async (): Promise<ImportTemplate[]> => {
      const { data, error } = await apiClient.GET('/imports/templates');
      if (error) throw error;
      return (data as ImportTemplateList).templates;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useUploadImport = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<ImportUploadResponse> => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE_URL}/imports/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      return res.json();
    },
  });
};

export const usePreviewImport = () => {
  return useMutation({
    mutationFn: async (req: {
      uploadToken: string;
      mappings: ImportColumnMapping[];
      skipDuplicates?: boolean;
    }): Promise<ImportPreviewResponse> => {
      const res = await fetch(`${API_BASE_URL}/imports/preview`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Preview failed' }));
        throw new Error(err.error || 'Preview failed');
      }
      return res.json();
    },
  });
};

export const useConfirmImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: {
      uploadToken: string;
      selectedRows?: number[];
      includeDuplicates?: boolean;
    }): Promise<ImportResult> => {
      const res = await fetch(`${API_BASE_URL}/imports/confirm`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Import failed' }));
        throw new Error(err.error || 'Import failed');
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateFlightDependentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
};

export type RestoreMode = NonNullable<NonNullable<operations['restoreUserData']['parameters']['query']>['mode']>;
type BackupPayload = components['schemas']['BackupPayload'];

/** Category of a restore failure. */
export type RestoreErrorKind =
  | 'account_not_empty'
  | 'replace_would_drop_attachments'
  | 'backup_version_unsupported'
  | 'too_large'
  | 'invalid_json'
  | 'not_a_backup'
  | 'generic';

/** Error thrown by `useRestoreJSON`; `message` is the API's error text, if any. */
export class RestoreError extends Error {
  readonly kind: RestoreErrorKind;
  readonly status?: number;

  constructor(kind: RestoreErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'RestoreError';
    this.kind = kind;
    this.status = status;
  }
}

const RESTORE_CODES: readonly RestoreErrorKind[] = [
  'account_not_empty',
  'replace_would_drop_attachments',
  'backup_version_unsupported',
];

function restoreErrorFrom(status: number, body: unknown): RestoreError {
  const err = body && typeof body === 'object' ? (body as { error?: unknown; code?: unknown }) : {};
  const message = typeof err.error === 'string' ? err.error : '';
  const code = typeof err.code === 'string' ? err.code : undefined;
  if (code && (RESTORE_CODES as readonly string[]).includes(code)) {
    return new RestoreError(code as RestoreErrorKind, message, status);
  }
  if (status === 413) return new RestoreError('too_large', message, status);
  if (status === 422) return new RestoreError('backup_version_unsupported', message, status);
  return new RestoreError('generic', message, status);
}

/**
 * Restore a NinerLog JSON backup (as produced by `GET /users/me/data`) via
 * `POST /users/me/data`.
 *
 * `mode: 'restore'` (default) needs an empty account; `mode: 'replace'` wipes
 * the account's logbook data and restores the backup in its place. The restore
 * is all-or-nothing. Rejects with a {@link RestoreError}.
 */
export const useRestoreJSON = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, mode = 'restore' }: { file: File; mode?: RestoreMode }): Promise<ImportJSONResult> => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new RestoreError('invalid_json', '');
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new RestoreError('not_a_backup', '');
      }
      const { data, error, response } = await apiClient.POST('/users/me/data', {
        params: { query: { mode } },
        body: parsed as BackupPayload,
        bodySerializer: () => text,
      });
      if (error !== undefined || !response.ok) throw restoreErrorFrom(response.status, error);
      return data as ImportJSONResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
};
