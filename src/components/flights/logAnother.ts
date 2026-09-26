import type { components } from '../../api/schema';
import type { FlightCrewMemberInput } from '../../types/api';
import { toCrewInputs } from './crewRoles';

type Flight = components['schemas']['Flight'];

/** Flight-form values "Log another like this" carries over; every time is empty. */
export interface FlightPrefill {
  values: {
    date: string;
    aircraftReg: string;
    aircraftType: string;
    departureIcao: string;
    arrivalIcao: string;
    launchMethod: string;
    instructorName: string;
    offBlockTime: string;
    onBlockTime: string;
    departureTime: string;
    arrivalTime: string;
  };
  crew: FlightCrewMemberInput[];
}

/** Prefill for the next flight like `flight`: aircraft, site, crew and launch method, no times. */
export function prefillFromFlight(flight: Flight): FlightPrefill {
  const departure = (flight.departureIcao ?? '').trim();
  const arrival = (flight.arrivalIcao ?? '').trim();
  const local = !arrival || arrival.toUpperCase() === departure.toUpperCase();
  return {
    values: {
      date: flight.date,
      aircraftReg: flight.aircraftReg ?? '',
      aircraftType: flight.aircraftType,
      departureIcao: departure,
      arrivalIcao: local ? departure : arrival,
      launchMethod: flight.launchMethod ?? '',
      instructorName: flight.instructorName ?? '',
      offBlockTime: '',
      onBlockTime: '',
      departureTime: '',
      arrivalTime: '',
    },
    crew: toCrewInputs(flight.crewMembers),
  };
}
