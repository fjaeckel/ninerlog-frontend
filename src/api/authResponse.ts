import type { components } from './schema';
import i18n from '../i18n';

type RegistrationResponse = components['schemas']['RegistrationResponse'];
type SessionResponse = components['schemas']['AuthResponse'];
type LoginResponse =
  | SessionResponse
  | components['schemas']['TwoFactorLoginRequired'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function invalidResponse(response: Response): never {
  console.error(
    `Unexpected authentication response: HTTP ${response.status} from ${response.url || 'the API'}. ` +
      'Check the API URL, allowed origins, and server versions.',
  );
  throw Object.assign(
    new Error(i18n.t('auth:unexpectedResponse', { status: response.status })),
    { httpStatus: response.status },
  );
}

/** True when `data` is a complete session: user plus both tokens and a positive expiry. */
export function isSession(data: unknown): data is SessionResponse {
  return (
    isPlainObject(data) &&
    !('requiresTwoFactor' in data) &&
    nonEmptyString(data.accessToken) &&
    nonEmptyString(data.refreshToken) &&
    typeof data.expiresIn === 'number' &&
    Number.isFinite(data.expiresIn) &&
    data.expiresIn > 0 &&
    isPlainObject(data.user) &&
    typeof data.user.id === 'string' &&
    typeof data.user.email === 'string' &&
    typeof data.user.name === 'string'
  );
}

/**
 * Rethrows an auth endpoint error. An error carrying nothing but its HTTP status
 * (empty or non-JSON body) becomes the unexpected-response error.
 */
export function throwAuthError(error: unknown, response: Response): never {
  if (
    isPlainObject(error) &&
    Object.keys(error).every((key) => key === 'httpStatus')
  ) {
    return invalidResponse(response);
  }
  throw error;
}

export function parseRegistrationResponse(
  data: unknown,
  response: Response,
): RegistrationResponse {
  if (
    response.status !== 201 ||
    !isPlainObject(data) ||
    typeof data.email !== 'string' ||
    typeof data.message !== 'string' ||
    typeof data.verificationRequired !== 'boolean'
  ) {
    return invalidResponse(response);
  }
  return data as RegistrationResponse;
}

export function parseLoginResponse(
  data: unknown,
  response: Response,
): LoginResponse {
  if (response.status !== 200 || !isPlainObject(data))
    return invalidResponse(response);
  if (
    data.requiresTwoFactor === true &&
    nonEmptyString(data.twoFactorToken) &&
    !('accessToken' in data) &&
    !('refreshToken' in data)
  ) {
    return data as LoginResponse;
  }
  if (isSession(data)) return data;
  return invalidResponse(response);
}

/** Validates a 200 response that must carry a complete session. */
export function parseSessionResponse(
  data: unknown,
  response: Response,
): SessionResponse {
  if (response.status !== 200 || !isSession(data))
    return invalidResponse(response);
  return data;
}
