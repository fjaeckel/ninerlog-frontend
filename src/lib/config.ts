/**
 * Runtime configuration helper.
 *
 * In Docker, the entrypoint injects window.ENV via /env-config.js.
 * During local dev, Vite provides import.meta.env.
 *
 * Priority: window.ENV (runtime) > import.meta.env (build-time) > defaults.
 */

declare global {
  interface Window {
    ENV?: {
      VITE_API_BASE_URL?: string;
      VITE_ENV?: string;
      VITE_APP_NAME?: string;
    };
  }
}

function getEnv(key: string, fallback: string): string {
  // Runtime injection (Docker)
  const runtimeVal = window.ENV?.[key as keyof typeof window.ENV];
  if (runtimeVal) return runtimeVal;

  // Build-time injection (Vite)
  const buildVal = import.meta.env[key];
  if (buildVal) return buildVal;

  return fallback;
}

export const API_BASE_URL = getEnv('VITE_API_BASE_URL', '/api/v1');
export const APP_ENV = getEnv('VITE_ENV', 'development');
export const APP_NAME = getEnv('VITE_APP_NAME', 'PilotLog');
