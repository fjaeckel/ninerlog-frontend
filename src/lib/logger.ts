/**
 * Structured application logger for the browser.
 *
 * In production every entry is emitted as a single JSON line, mirroring the
 * shape of the nginx access log and the Go API's slog output ({time, level,
 * logger, msg, ...context}). That keeps browser logs — surfaced via the iOS
 * Web Inspector or piped out of a wrapping WebView — parseable with the same
 * tooling as the rest of the stack. In development entries stay human-readable
 * so the DevTools console remains easy to scan.
 *
 * This module is the one sanctioned place that touches `console` directly;
 * everything else goes through a scoped logger from `createLogger`.
 */
import { APP_ENV } from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext): void;
}

const isProd = APP_ENV === 'production';

// Route each level to the matching console method so DevTools keeps its
// severity styling and level filtering (and stack capture on error).
const consoleFor: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

// Errors don't survive JSON.stringify (their fields are non-enumerable), so
// unpack any Error in the context into a plain, serializable object.
function normalizeContext(context?: LogContext): LogContext {
  if (!context) return {};
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] =
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value;
  }
  return out;
}

function emit(level: LogLevel, scope: string, msg: string, context?: LogContext): void {
  const fields = normalizeContext(context);

  if (isProd) {
    const entry = {
      time: new Date().toISOString(),
      level,
      logger: scope,
      msg,
      ...fields,
    };
    consoleFor[level](JSON.stringify(entry));
    return;
  }

  // Development: readable line, with context appended only when present.
  const hasFields = Object.keys(fields).length > 0;
  consoleFor[level](`[${scope}] ${msg}`, ...(hasFields ? [fields] : []));
}

/**
 * Create a logger bound to a `scope` (component or module name), recorded as
 * the `logger` field on every entry for filtering and correlation.
 */
export function createLogger(scope: string): Logger {
  return {
    debug: (msg, context) => emit('debug', scope, msg, context),
    info: (msg, context) => emit('info', scope, msg, context),
    warn: (msg, context) => emit('warn', scope, msg, context),
    error: (msg, context) => emit('error', scope, msg, context),
  };
}

/** Default app-scoped logger for one-off call sites. */
export const logger = createLogger('app');
