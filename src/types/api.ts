// Type definitions matching OpenAPI spec exactly
// Source: ninerlog-project/api-spec/openapi.yaml

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
  isAdmin?: boolean;
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

export interface License {
  id: string;
  userId: string;
  regulatoryAuthority: string;
  licenseType: string;
  licenseNumber: string;
  issueDate: string;
  issuingAuthority: string;
  requiresSeparateLogbook: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseCreate {
  regulatoryAuthority: string;
  licenseType: string;
  licenseNumber: string;
  issueDate: string;
  issuingAuthority: string;
  requiresSeparateLogbook?: boolean;
}

export interface LicenseUpdate {
  regulatoryAuthority?: string;
  licenseType?: string;
  licenseNumber?: string;
  issuingAuthority?: string;
  requiresSeparateLogbook?: boolean;
}

// ============ Flight Types ============

export interface Flight {
  id: string;
  userId: string;
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

export type CurrencyStatus = 'current' | 'expiring' | 'expired' | 'unknown';

export interface CurrencyRequirement {
  name: string;
  met: boolean;
  current: number;
  required: number;
  unit: string;
  message: string;
}

export interface CurrencyProgress {
  totalHours: number;
  picHours: number;
  ifrHours: number;
  instructorHours: number;
  nightHours: number;
  landings: number;
  dayLandings: number;
  nightLandings: number;
  flights: number;
  approaches: number;
  holds: number;
  requiredHours?: number;
  requiredLandings?: number;
}

export interface ClassRatingCurrency {
  classRatingId: string;
  classType: ClassType;
  licenseId: string;
  regulatoryAuthority: string;
  licenseType?: string;
  status: CurrencyStatus;
  expiryDate?: string | null;
  message: string;
  ruleDescription?: string;
  progress?: CurrencyProgress;
  requirements?: CurrencyRequirement[];
}

export interface CurrencyStatusResponse {
  ratings: ClassRatingCurrency[];
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

// ============ Class Rating Types ============

export type ClassType = 'SEP_LAND' | 'SEP_SEA' | 'MEP_LAND' | 'MEP_SEA' | 'SET_LAND' | 'SET_SEA' | 'TMG' | 'IR' | 'OTHER';

export interface ClassRating {
  id: string;
  licenseId: string;
  classType: ClassType;
  issueDate: string;
  expiryDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassRatingCreate {
  classType: ClassType;
  issueDate: string;
  expiryDate?: string | null;
  notes?: string | null;
}

export interface ClassRatingUpdate {
  issueDate?: string;
  expiryDate?: string | null;
  notes?: string | null;
}
