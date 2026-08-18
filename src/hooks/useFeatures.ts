import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type Features = components['schemas']['Features'];
type DocumentFilesFeature = Features['documentFiles'];

/** Which optional features this server has switched on. Fetched once per session. */
export const useFeatures = () => {
  return useQuery({
    queryKey: ['features'],
    queryFn: async (): Promise<Features> => {
      const { data, error } = await apiClient.GET('/features');
      if (error) throw error;
      return data as Features;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

/**
 * The document-file capability. Reads as disabled until the probe answers or
 * when it fails; limits are meaningful only when `enabled` is true.
 */
export const useDocumentFilesFeature = (): DocumentFilesFeature & { isLoading: boolean } => {
  const { data, isLoading } = useFeatures();
  const feature = data?.documentFiles as Partial<DocumentFilesFeature> | undefined;
  return {
    enabled: feature?.enabled ?? false,
    maxBytes: feature?.maxBytes ?? 0,
    maxPerDocument: feature?.maxPerDocument ?? 0,
    allowedContentTypes: feature?.allowedContentTypes ?? [],
    isLoading,
  };
};
