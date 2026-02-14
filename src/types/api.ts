// Type definitions matching OpenAPI spec exactly
// Source: pilotlog-project/api-spec/openapi.yaml

// ============ Common Types ============

export interface Error {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// ============ Authentication Types ============

export interface User {
  id: string;
  email: string;
  name: string;
  twoFactorEnabled?: boolean;
  defaultLicenseId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string; // Required per OpenAPI spec
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ============ License Types ============

export type LicenseType =
  | 'EASA_PPL'
  | 'FAA_PPL'
  | 'EASA_SPL'
  | 'FAA_SPORT'
  | 'EASA_CPL'
  | 'FAA_CPL'
  | 'EASA_ATPL'
  | 'FAA_ATPL'
  | 'EASA_IR'
  | 'FAA_IR';

export interface License {
  id: string;
  userId: string;
  licenseType: LicenseType;
  licenseNumber: string;
  issueDate: string;
  expiryDate?: string | null;
  issuingAuthority: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseCreate {
  licenseType: LicenseType;
  licenseNumber: string;
  issueDate: string;
  expiryDate?: string | null;
  issuingAuthority: string;
}

export interface LicenseUpdate {
  expiryDate?: string | null;
  isActive?: boolean;
}

// ============ License List Query Params ============

export interface ListLicensesParams {
  isActive?: boolean;
}

// ============ Flight Types ============

export interface Flight {
  id: string;
  userId: string;
  licenseId: string;
  date: string;
  aircraftReg: string;
  aircraftType: string;
  departureIcao: string | null;
  arrivalIcao: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  totalTime: number;
  picTime: number;
  dualTime: number;
  nightTime: number;
  ifrTime: number;
  landingsDay: number;
  landingsNight: number;
  remarks: string | null;
  // New fields
  instructorName: string | null;
  instructorComments: string | null;
  sicTime: number;
  dualGivenTime: number;
  simulatedFlightTime: number;
  groundTrainingTime: number;
  crewMembers?: FlightCrewMember[];
  createdAt: string;
  updatedAt: string;
}

export interface FlightCreate {
  licenseId: string;
  date: string;
  aircraftReg: string;
  aircraftType: string;
  departureIcao?: string | null;
  arrivalIcao?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  totalTime: number;
  picTime?: number;
  dualTime?: number;
  ifrTime?: number;
  landings?: number;
  remarks?: string | null;
  instructorName?: string | null;
  instructorComments?: string | null;
  sicTime?: number;
  dualGivenTime?: number;
  simulatedFlightTime?: number;
  groundTrainingTime?: number;
  crewMembers?: FlightCrewMemberInput[];
}

export interface FlightUpdate {
  date?: string;
  aircraftReg?: string;
  aircraftType?: string;
  departureIcao?: string | null;
  arrivalIcao?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  totalTime?: number;
  picTime?: number;
  dualTime?: number;
  ifrTime?: number;
  landings?: number;
  remarks?: string | null;
}

// ============ Flight List Query Params ============

export interface ListFlightsParams {
  licenseId?: string;
  startDate?: string;
  endDate?: string;
  aircraftReg?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'date' | 'totalTime' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ============ Pagination Types ============

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedFlights {
  data: Flight[];
  pagination: Pagination;
}

// ============ Statistics Types ============

export interface Statistics {
  licenseId: string;
  totalFlights: number;
  totalHours: number;
  picHours: number;
  dualHours: number;
  nightHours: number;
  ifrHours: number;
  landingsDay: number;
  landingsNight: number;
}

export interface StatisticsParams {
  startDate?: string;
  endDate?: string;
}

// ============ Currency Types ============

export interface Currency {
  licenseId: string;
  isCurrent: boolean;
  daysCurrent: boolean;
  nightsCurrent: boolean;
  last90Days: {
    flights: number;
    totalLandings: number;
    dayLandings: number;
    nightLandings: number;
  };
  requiredLandings: {
    day: number;
    night: number;
  };
  expiryDate: string | null;
}

// ============ Crew & Contact Types ============

export type CrewRole = 'PIC' | 'SIC' | 'Instructor' | 'Student' | 'Passenger' | 'SafetyPilot' | 'Examiner';

export interface FlightCrewMember {
  id: string;
  flightId: string;
  contactId?: string | null;
  name: string;
  role: CrewRole;
}

export interface FlightCrewMemberInput {
  contactId?: string | null;
  name: string;
  role: CrewRole;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactCreate {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}
