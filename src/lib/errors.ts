/**
 * Extract a user-friendly error message from an API error response.
 * Handles both openapi-fetch errors (err.error) and axios errors (err.response?.data?.error).
 */
export function extractApiError(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (err && typeof err === 'object') {
    // openapi-fetch: thrown error has { error: string } shape
    if ('error' in err && typeof (err as any).error === 'string') {
      return (err as any).error;
    }
    // axios: error.response.data.error
    if ('response' in err) {
      const resp = (err as any).response;
      if (resp?.data?.error && typeof resp.data.error === 'string') {
        return resp.data.error;
      }
      if (resp?.data?.message && typeof resp.data.message === 'string') {
        return resp.data.message;
      }
    }
    // Generic Error object
    if ('message' in err && typeof (err as any).message === 'string') {
      return (err as any).message;
    }
  }
  if (typeof err === 'string') {
    return err;
  }
  return fallback;
}

/**
 * Extract HTTP status code from an API error, if available.
 */
export function extractApiStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    // openapi-fetch: may have status on the error
    if ('status' in err && typeof (err as any).status === 'number') {
      return (err as any).status;
    }
    // axios: error.response.status
    if ('response' in err) {
      const status = (err as any).response?.status;
      if (typeof status === 'number') return status;
    }
  }
  return undefined;
}

/**
 * Extract field-level error details from an API error response.
 * The API may return a `details` array of `{ field, message }` objects.
 * Returns a map of field name → error message for inline form display.
 */
export function extractApiFieldErrors(err: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (err && typeof err === 'object') {
    // openapi-fetch: { details: [{ field: "email", message: "..." }] }
    const details = (err as any).details ?? (err as any).response?.data?.details;
    if (Array.isArray(details)) {
      for (const d of details) {
        if (d && typeof d.field === 'string' && typeof d.message === 'string') {
          result[d.field] = d.message;
        }
      }
    }
  }
  return result;
}
