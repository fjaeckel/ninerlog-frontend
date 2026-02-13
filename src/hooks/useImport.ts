import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import type { components } from '../api/schema';

type ImportUploadResponse = components['schemas']['ImportUploadResponse'];
type ImportPreviewResponse = components['schemas']['ImportPreviewResponse'];
type ImportResult = components['schemas']['ImportResult'];
type ImportColumnMapping = components['schemas']['ImportColumnMapping'];

export type { ImportUploadResponse, ImportPreviewResponse, ImportResult, ImportColumnMapping };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

function getAuthHeaders() {
  const token = useAuthStore.getState().accessToken;
  return { Authorization: `Bearer ${token}` };
}

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
      licenseId: string;
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
  return useMutation({
    mutationFn: async (req: {
      uploadToken: string;
      licenseId: string;
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
  });
};
