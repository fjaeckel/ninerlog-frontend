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
 * The document-file capability, with a conservative default.
 *
 * Until the probe answers — and if it fails — the feature reads as disabled,
 * so the UI never offers an upload control that the server would refuse. The
 * limits are only meaningful when `enabled` is true; they mirror the server's
 * own so a file can be rejected before it is sent.
 *
 * Every step is optional-chained, including the `documentFiles` key itself,
 * even though the generated type says it is always present. The type describes
 * the spec this client was built against, not whatever server it is actually
 * talking to — an older or newer API answering `/features` without that key
 * would otherwise throw here, during render, and take the whole page down with
 * it rather than merely hiding an upload button. A capability probe that can
 * crash the app is worse than no probe at all.
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
