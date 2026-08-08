import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type Features = components['schemas']['Features'];
type DocumentFilesFeature = Features['documentFiles'];

/**
 * Which optional features this server has switched on.
 *
 * A NinerLog server can be deployed with features disabled (currently
 * licence/credential images). The answer only changes when the operator
 * redeploys, so this is fetched once and kept for the session rather than
 * revalidated per screen.
 */
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
 * The document-image capability, with a conservative default.
 *
 * Until the probe answers — and if it fails — the feature reads as disabled,
 * so the UI never offers an upload control that the server would refuse. The
 * limits are only meaningful when `enabled` is true; they mirror the server's
 * own so a file can be rejected before it is sent.
 */
export const useDocumentFilesFeature = (): DocumentFilesFeature & { isLoading: boolean } => {
  const { data, isLoading } = useFeatures();
  return {
    enabled: data?.documentFiles.enabled ?? false,
    maxBytes: data?.documentFiles.maxBytes ?? 0,
    maxPerDocument: data?.documentFiles.maxPerDocument ?? 0,
    allowedContentTypes: data?.documentFiles.allowedContentTypes ?? [],
    isLoading,
  };
};
