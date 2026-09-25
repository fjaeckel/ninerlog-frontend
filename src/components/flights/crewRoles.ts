import type { CrewRole, FlightCrewMember, FlightCrewMemberInput } from '../../types/api';

/** Every crew role, in picker order. */
export const CREW_ROLES: readonly CrewRole[] = [
  'PIC',
  'SIC',
  'Instructor',
  'Student',
  'Passenger',
  'SafetyPilot',
  'Examiner',
];

/** Pill colours per crew role, light and dark. */
export const CREW_ROLE_TONE: Record<CrewRole, string> = {
  PIC: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800',
  SIC: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800',
  Instructor: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800',
  Student: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800',
  Passenger: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600',
  SafetyPilot: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800',
  Examiner: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:ring-fuchsia-800',
};

/** Crew as update input, from the crew a flight was read with. */
export function toCrewInputs(members?: FlightCrewMember[] | null): FlightCrewMemberInput[] {
  return (members ?? []).map((m) => ({ contactId: m.contactId ?? null, name: m.name, role: m.role }));
}

/** Instructor and PIC names taken from the crew list. */
export function crewDerivedNames(crew: FlightCrewMemberInput[]): {
  instructorName: string | null;
  picName: string | null;
} {
  return {
    instructorName: crew.find((m) => m.role === 'Instructor')?.name ?? null,
    picName: crew.find((m) => m.role === 'PIC')?.name ?? null,
  };
}
