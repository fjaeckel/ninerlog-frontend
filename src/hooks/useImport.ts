import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';
import { invalidateFlightDependentQueries } from './invalidation';

type ImportUploadResponse = components['schemas']['ImportUploadResponse'];
type ImportPreviewResponse = components['schemas']['ImportPreviewResponse'];
type ImportResult = components['schemas']['ImportResult'];
type ImportColumnMapping = components['schemas']['ImportColumnMapping'];
type ImportJSONResult = components['schemas']['ImportJSONResult'];
type PaginatedImports = components['schemas']['PaginatedImports'];

export type {
  ImportUploadResponse,
  ImportPreviewResponse,
  ImportResult,
  ImportColumnMapping,
  ImportJSONResult,
  PaginatedImports,
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

/**
 * Restore a NinerLog JSON backup (as produced by `GET /exports/json`).
 * Additive: never deletes or modifies existing data; skips aircraft whose
 * registration already exists for the user.
 */
export const useRestoreJSON = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ImportJSONResult> => {
      // Reject broken JSON before the network round-trip.
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Selected file is not valid JSON');
      }
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Selected file is not a NinerLog JSON backup');
      }
      const res = await fetch(`${API_BASE_URL}/imports/json`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: text,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Restore failed' }));
        throw new Error(err.error || 'Restore failed');
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateFlightDependentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['aircraft'] });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      queryClient.invalidateQueries({ queryKey: ['class-ratings'] });
    },
  });
};
