import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';
import { PILOT_PROFILE_QUERY_KEY } from './invalidation';

export type PilotProfile = components['schemas']['PilotProfile'];
export type PilotProfileUpdate = components['schemas']['PilotProfileUpdate'];
export type Discipline = components['schemas']['Discipline'];
export type DisciplineState = components['schemas']['DisciplineState'];
export type DisciplineStatus = components['schemas']['DisciplineStatus'];
export type DisciplineIntent = components['schemas']['DisciplineIntent'];
export type DisciplineEvidence = components['schemas']['DisciplineEvidence'];
export type ProfileMode = PilotProfile['mode'];

/** Disciplines this client knows, in API order. */
export const DISCIPLINES: readonly Discipline[] = [
  'AEROPLANE', 'TMG', 'SAILPLANE', 'ULTRALIGHT', 'GYROPLANE',
  'HELICOPTER', 'IFR', 'MULTI_CREW', 'INSTRUCTOR', 'SIMULATOR',
];

const KNOWN_STATUSES: readonly string[] = ['active', 'training', 'dormant', 'off'];

export const isKnownDiscipline = (d: string): d is Discipline =>
  (DISCIPLINES as readonly string[]).includes(d);

/** `GET /users/me/pilot-profile`, fresh for five minutes. */
export const usePilotProfile = () =>
  useQuery({
    queryKey: [...PILOT_PROFILE_QUERY_KEY],
    queryFn: async (): Promise<PilotProfile> => {
      const { data, error } = await apiClient.GET('/users/me/pilot-profile');
      if (error) throw error;
      return data as PilotProfile;
    },
    staleTime: 5 * 60 * 1000,
  });

/** `PATCH /users/me/pilot-profile`; the returned profile replaces the cached one. */
export const useUpdatePilotProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PilotProfileUpdate): Promise<PilotProfile> => {
      const { data, error } = await apiClient.PATCH('/users/me/pilot-profile', { body });
      if (error) throw error;
      return data as PilotProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...PILOT_PROFILE_QUERY_KEY], data);
    },
  });
};

export interface Disciplines {
  /** Stored mode; `adaptive` while the profile is unavailable. */
  mode: ProfileMode;
  isLoading: boolean;
  /** False while loading, on error, or when the profile holds no disciplines. */
  isReady: boolean;
  /** Status of `d`; `active` whenever the profile cannot answer. */
  status: (d: Discipline | string) => DisciplineStatus;
  /** Stored intent of `d`; `auto` whenever the profile cannot answer. */
  intent: (d: Discipline | string) => DisciplineIntent;
  /** True when any of `ds` is active or training, in everything mode, or whenever the profile cannot answer. */
  isRelevant: (ds: readonly (Discipline | string)[]) => boolean;
  /** Evidence behind `d`; empty when unknown. */
  evidence: (d: Discipline | string) => DisciplineEvidence[];
}

/** Resolves discipline relevance from the pilot profile, failing open. */
export function resolveDisciplines(profile: PilotProfile | null | undefined, isLoading: boolean): Disciplines {
  const byDiscipline = new Map<string, DisciplineState>();
  for (const s of profile?.disciplines ?? []) byDiscipline.set(s.discipline, s);
  const isReady = !isLoading && byDiscipline.size > 0;
  const mode: ProfileMode = profile?.mode === 'everything' ? 'everything' : 'adaptive';

  const status = (d: string): DisciplineStatus => {
    if (!isReady || !isKnownDiscipline(d)) return 'active';
    const s = byDiscipline.get(d)?.status;
    return s && KNOWN_STATUSES.includes(s) ? s : 'active';
  };
  const intent = (d: string): DisciplineIntent => (isReady ? byDiscipline.get(d)?.intent ?? 'auto' : 'auto');
  const isRelevant = (ds: readonly string[]) =>
    !isReady || mode === 'everything' || ds.some((d) => {
      const s = status(d);
      return s === 'active' || s === 'training';
    });
  const evidence = (d: string) => (isReady ? byDiscipline.get(d)?.evidence ?? [] : []);

  return { mode, isLoading, isReady, status, intent, isRelevant, evidence };
}

/** Discipline relevance for the signed-in pilot. Fails open: loading, error, empty or unknown → active. */
export function useDisciplines(): Disciplines {
  const { data, isLoading, isError } = usePilotProfile();
  const profile = isError ? null : data;
  return useMemo(() => resolveDisciplines(profile, isLoading), [profile, isLoading]);
}

