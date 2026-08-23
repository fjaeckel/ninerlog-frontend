import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type {
  CustomCurrencyRule,
  CustomCurrencyEvaluation,
  CustomCurrencyRuleBody,
  CustomRuleInput,
  CustomRuleWithStatus,
  SharedRuleView,
} from '../types/customCurrency';

const QUERY_KEY = ['custom-currency'];

/**
 * The API answers a failure as `{ "error": "..." }` and openapi-fetch hands
 * that body back as `error`. Surfacing the message keeps the builder able to
 * show which part of a rule was rejected.
 */
function asError(error: unknown): Error {
  const message = (error as { error?: string } | undefined)?.error;
  return new Error(message || 'Request failed');
}

export const useCustomCurrencies = () => {
  const { accessToken } = useAuthStore();
  return useQuery<CustomRuleWithStatus[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/custom-currency');
      if (error) throw asError(error);
      return data;
    },
    enabled: !!accessToken,
  });
};

export const useCreateCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation<CustomRuleWithStatus, Error, CustomRuleInput>({
    mutationFn: async (input) => {
      const { data, error } = await apiClient.POST('/custom-currency', { body: input });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useUpdateCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation<CustomRuleWithStatus, Error, { id: string; input: CustomRuleInput }>({
    mutationFn: async ({ id, input }) => {
      const { data, error } = await apiClient.PUT('/custom-currency/{ruleId}', {
        params: { path: { ruleId: id } },
        body: input,
      });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useDeleteCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await apiClient.DELETE('/custom-currency/{ruleId}', {
        params: { path: { ruleId: id } },
      });
      if (error) throw asError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

/** Evaluate an unsaved definition for the live preview. */
export const usePreviewCustomCurrency = () =>
  useMutation<CustomCurrencyEvaluation, Error, CustomCurrencyRuleBody>({
    mutationFn: async (definition) => {
      const { data, error } = await apiClient.POST('/custom-currency/preview', {
        body: { definition },
      });
      if (error) throw asError(error);
      return data;
    },
  });

export const useSetEnabledCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation<CustomRuleWithStatus, Error, { id: string; enabled: boolean }>({
    mutationFn: async ({ id, enabled }) => {
      const { data, error } = await apiClient.PUT('/custom-currency/{ruleId}/enabled', {
        params: { path: { ruleId: id } },
        body: { enabled },
      });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useSetNotifyCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation<CustomRuleWithStatus, Error, { id: string; notify: boolean }>({
    mutationFn: async ({ id, notify }) => {
      const { data, error } = await apiClient.PUT('/custom-currency/{ruleId}/notify', {
        params: { path: { ruleId: id } },
        body: { notify },
      });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useSetShareCustomCurrency = () => {
  const qc = useQueryClient();
  return useMutation<CustomCurrencyRule, Error, { id: string; shared: boolean }>({
    mutationFn: async ({ id, shared }) => {
      const params = { path: { ruleId: id } };
      const { data, error } = shared
        ? await apiClient.POST('/custom-currency/{ruleId}/share', { params })
        : await apiClient.DELETE('/custom-currency/{ruleId}/share', { params });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useSharedRule = (token: string | null) => {
  const { accessToken } = useAuthStore();
  return useQuery<SharedRuleView>({
    queryKey: ['custom-currency', 'shared', token],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/custom-currency/shared/{shareToken}', {
        params: { path: { shareToken: token as string } },
      });
      if (error) throw asError(error);
      return data;
    },
    enabled: !!accessToken && !!token,
    retry: false,
  });
};

export const useImportSharedRule = () => {
  const qc = useQueryClient();
  return useMutation<CustomRuleWithStatus, Error, string>({
    mutationFn: async (token) => {
      const { data, error } = await apiClient.POST('/custom-currency/shared/{shareToken}/import', {
        params: { path: { shareToken: token } },
      });
      if (error) throw asError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};
