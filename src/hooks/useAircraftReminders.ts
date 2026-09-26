import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';

type AircraftReminder = components['schemas']['AircraftReminder'];
type AircraftReminderKind = components['schemas']['AircraftReminderKind'];
type AircraftReminderCreate = components['schemas']['AircraftReminderCreate'];
type AircraftReminderUpdate = components['schemas']['AircraftReminderUpdate'];

export type { AircraftReminder, AircraftReminderKind, AircraftReminderCreate, AircraftReminderUpdate };

/** Root key of every reminder query, per aircraft and across the fleet. */
export const AIRCRAFT_REMINDERS_KEY = ['aircraft-reminders'] as const;

export const aircraftRemindersKey = (aircraftId: string) => [...AIRCRAFT_REMINDERS_KEY, 'aircraft', aircraftId] as const;

export const allAircraftRemindersKey = (dueWithinDays?: number) =>
  [...AIRCRAFT_REMINDERS_KEY, 'all', { dueWithinDays }] as const;

/** Invalidates every reminder list, per aircraft and fleet-wide. */
export function invalidateAircraftReminders(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: AIRCRAFT_REMINDERS_KEY });
}

/** One aircraft's reminders, ordered by due date. */
export const useAircraftReminders = (aircraftId: string) =>
  useQuery({
    queryKey: aircraftRemindersKey(aircraftId),
    queryFn: async (): Promise<AircraftReminder[]> => {
      const { data, error } = await apiClient.GET('/aircraft/{aircraftId}/reminders', {
        params: { path: { aircraftId } },
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!aircraftId,
  });

/** The caller's reminders across all aircraft; `dueWithinDays` keeps those due within N days, overdue included. */
export const useAllAircraftReminders = (dueWithinDays?: number) =>
  useQuery({
    queryKey: allAircraftRemindersKey(dueWithinDays),
    queryFn: async (): Promise<AircraftReminder[]> => {
      const { data, error } = await apiClient.GET('/aircraft-reminders', {
        params: { query: dueWithinDays === undefined ? {} : { dueWithinDays } },
      });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateAircraftReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ aircraftId, data }: { aircraftId: string; data: AircraftReminderCreate }) => {
      const { data: result, error } = await apiClient.POST('/aircraft/{aircraftId}/reminders', {
        params: { path: { aircraftId } },
        body: data,
      });
      if (error) throw error;
      return result as AircraftReminder;
    },
    onSuccess: () => invalidateAircraftReminders(queryClient),
  });
};

export const useUpdateAircraftReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      aircraftId,
      reminderId,
      data,
    }: {
      aircraftId: string;
      reminderId: string;
      data: AircraftReminderUpdate;
    }) => {
      const { data: result, error } = await apiClient.PATCH('/aircraft/{aircraftId}/reminders/{reminderId}', {
        params: { path: { aircraftId, reminderId } },
        body: data,
      });
      if (error) throw error;
      return result as AircraftReminder;
    },
    onSuccess: () => invalidateAircraftReminders(queryClient),
  });
};

export const useDeleteAircraftReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ aircraftId, reminderId }: { aircraftId: string; reminderId: string }) => {
      const { error } = await apiClient.DELETE('/aircraft/{aircraftId}/reminders/{reminderId}', {
        params: { path: { aircraftId, reminderId } },
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateAircraftReminders(queryClient),
  });
};

/** Marks a reminder done on `doneOn` (API default: today, UTC); with an interval the due date rolls forward. */
export const useCompleteAircraftReminder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      aircraftId,
      reminderId,
      doneOn,
    }: {
      aircraftId: string;
      reminderId: string;
      doneOn?: string;
    }) => {
      const { data: result, error } = await apiClient.POST('/aircraft/{aircraftId}/reminders/{reminderId}/complete', {
        params: { path: { aircraftId, reminderId } },
        body: doneOn ? { doneOn } : {},
      });
      if (error) throw error;
      return result as AircraftReminder;
    },
    onSuccess: () => invalidateAircraftReminders(queryClient),
  });
};
