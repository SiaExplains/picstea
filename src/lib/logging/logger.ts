/**
 * Application logger.
 *
 * Context values are restricted to primitives on purpose: it makes it a type error to pass a
 * document, layer, Blob or pixel buffer into a log line. User document data must never reach
 * logs or error reporting (docs/07_STORAGE_PRIVACY.md).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Readonly<Record<string, string | number | boolean | null | undefined>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function defaultMinLevel(): LogLevel {
  return typeof process !== "undefined" && process.env.NODE_ENV === "production" ? "warn" : "debug";
}

export function createLogger(scope: string, minLevel: LogLevel = defaultMinLevel()): Logger {
  const emit = (level: LogLevel, message: string, context?: LogContext) => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    const line = `[picstea:${scope}] ${message}`;
    const args = context ? [line, context] : [line];
    console[level === "debug" ? "debug" : level](...args);
  };
  return {
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
  };
}

/** Reduce an unknown thrown value to a log-safe description (no stack payloads with user data). */
export function describeError(error: unknown): LogContext {
  if (error instanceof Error) return { errorName: error.name, errorMessage: error.message };
  return { errorName: typeof error };
}

export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
