import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, httpStatusOf } from '../api/client';
import type { components } from '../api/schema';
import { invalidateFlightDependentQueries } from './invalidation';

export type FlightFile = components['schemas']['FlightFile'];
export type IgcFlightPreview = components['schemas']['IgcFlightPreview'];
export type IgcImportResult = components['schemas']['IgcImportResult'];

export const flightFilesKey = (flightId: string) => ['flightFiles', flightId] as const;

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** A failed IGC request: HTTP status, the API's message, and the flight already holding the file on a 409. */
export class IgcRequestError extends Error {
  readonly status: number | undefined;
  readonly existingFlightId: string | undefined;

  constructor(status: number | undefined, message: string) {
    super(message);
    this.name = 'IgcRequestError';
    this.status = status;
    this.existingFlightId = status === 409 ? message.match(UUID_RE)?.[0] : undefined;
  }
}

/** Wraps an openapi-fetch error body as an `IgcRequestError`. */
export function toIgcError(error: unknown): IgcRequestError {
  if (error instanceof IgcRequestError) return error;
  const body = typeof error === 'object' && error !== null ? (error as { error?: unknown }) : {};
  const message = typeof body.error === 'string' ? body.error : '';
  return new IgcRequestError(httpStatusOf(error), message);
}

const igcForm = (file: File, flightId?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (flightId) form.append('flightId', flightId);
  return form;
};

/** Analyses an IGC file without storing it. */
export const usePreviewIgc = () =>
  useMutation({
    mutationFn: async (file: File): Promise<IgcFlightPreview> => {
      const { data, error } = await apiClient.POST('/flights/igc/preview', {
        body: igcForm(file) as unknown as components['schemas']['IgcFileUpload'],
      });
      if (error) throw toIgcError(error);
      return data as IgcFlightPreview;
    },
  });

/** Stores an IGC file, creating a flight from it or attaching it to `flightId`. */
export const useImportIgc = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, flightId }: { file: File; flightId?: string }): Promise<IgcImportResult> => {
      const { data, error } = await apiClient.POST('/flights/igc', {
        body: igcForm(file, flightId) as unknown as components['schemas']['IgcFlightImport'],
      });
      if (error) throw toIgcError(error);
      return data as IgcImportResult;
    },
    onSuccess: (result) => {
      invalidateFlightDependentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: flightFilesKey(result.flight.id) });
    },
  });
};

/** How long a flight's file list stays fresh. */
export const FLIGHT_FILES_STALE_TIME_MS = 60_000;

/** Metadata of a flight's recorder files. */
export const useFlightFiles = (flightId: string | null | undefined) =>
  useQuery({
    queryKey: flightFilesKey(flightId ?? ''),
    queryFn: async (): Promise<FlightFile[]> => {
      const { data, error } = await apiClient.GET('/flights/{flightId}/files', {
        params: { path: { flightId: flightId as string } },
      });
      if (error) throw error;
      return (data as FlightFile[] | null) ?? [];
    },
    enabled: !!flightId,
    staleTime: FLIGHT_FILES_STALE_TIME_MS,
  });

export const useDeleteFlightFile = (flightId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: string): Promise<void> => {
      const { error } = await apiClient.DELETE('/flights/{flightId}/files/{fileId}', {
        params: { path: { flightId, fileId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flightFilesKey(flightId) });
    },
  });
};

/** Downloads a stored recorder file to disk. */
export const useDownloadFlightFile = (flightId: string) =>
  useMutation({
    mutationFn: async (file: FlightFile): Promise<void> => {
      const { data, error } = await apiClient.GET('/flights/{flightId}/files/{fileId}', {
        params: { path: { flightId, fileId: file.id } },
        parseAs: 'blob',
      });
      if (error) throw error;
      const url = URL.createObjectURL(data as Blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename || 'flight.igc';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  });
