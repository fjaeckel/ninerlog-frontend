import type { components } from './schema';
import i18n from '../i18n';

type RegistrationResponse = components['schemas']['RegistrationResponse'];
type LoginResponse =
  | components['schemas']['AuthResponse']
  | components['schemas']['TwoFactorLoginRequired'];

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidResponse(response: Response): never {
  throw Object.assign(
    new Error(i18n.t('auth:unexpectedResponse', { status: response.status })),
    {
      httpStatus: response.status,
    },
  );
}

export function parseRegistrationResponse(
  data: unknown,
  response: Response,
): RegistrationResponse {
  if (
    response.status !== 201 ||
    !object(data) ||
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
  if (response.status !== 200 || !object(data))
    return invalidResponse(response);
  if (
    data.requiresTwoFactor === true &&
    typeof data.twoFactorToken === 'string' &&
    data.twoFactorToken &&
    !('accessToken' in data) &&
    !('refreshToken' in data)
  ) {
    return data as LoginResponse;
  }
  if (
    !('requiresTwoFactor' in data) &&
    typeof data.accessToken === 'string' &&
    data.accessToken &&
    typeof data.refreshToken === 'string' &&
    data.refreshToken &&
    typeof data.expiresIn === 'number' &&
    Number.isFinite(data.expiresIn) &&
    data.expiresIn > 0 &&
    object(data.user) &&
    typeof data.user.id === 'string' &&
    typeof data.user.email === 'string' &&
    typeof data.user.name === 'string'
  ) {
    return data as LoginResponse;
  }
  return invalidResponse(response);
}
