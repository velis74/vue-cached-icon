import { globalCache } from './cache';

const FIRST_RETRY_DELAY = 2000; // ms
const MAX_RETRY_DELAY = 60000; // ms
// 401 and 403 are included because the user may log in or be granted access while the icon is displayed
const TRANSIENT_STATUSES = [401, 403, 408, 429];

/**
 * A failed attempt to load an icon. It is stored in the cache in place of the icon, so that every icon with the same
 * name shares it until the next attempt.
 */
export class IconLoadError extends Error {
  /**
   * @param message description of the failure
   * @param attempt number of consecutive failed attempts, including this one
   * @param retryAt time (ms since epoch) from which another attempt is made; undefined when the failure is permanent
   */
  constructor(
    message: string,
    readonly attempt: number,
    readonly retryAt?: number,
  ) {
    super(message);
    this.name = 'IconLoadError';
  }
}

type ErrorResponse = { status: number; headers?: Record<string, string | undefined> };

// Retry-After holds either a number of seconds or an HTTP date
function parseRetryAfter(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/**
 * Classifies an error thrown while fetching an icon. A request without a response (network error), 5xx, 401, 403,
 * 408 and 429 are retried with a delay doubling from 2 s up to 60 s, or after the delay the server requests in
 * Retry-After. Any other HTTP status is permanent.
 * @param err error thrown by the request
 * @param url requested URL
 * @param attempt number of consecutive failed attempts, including this one
 */
export function toIconLoadError(err: unknown, url: string, attempt: number): IconLoadError {
  if (err instanceof IconLoadError) return err;
  const response = (err as { response?: ErrorResponse } | undefined)?.response;
  if (response === undefined) {
    const reason = err instanceof Error ? err.message : String(err);
    const retryAt = Date.now() + Math.min(FIRST_RETRY_DELAY * 2 ** (attempt - 1), MAX_RETRY_DELAY);
    return new IconLoadError(`Loading "${url}" failed: ${reason}`, attempt, retryAt);
  }
  const message = `Loading "${url}" failed with HTTP status ${response.status}`;
  if (response.status < 500 && !TRANSIENT_STATUSES.includes(response.status)) {
    return new IconLoadError(message, attempt);
  }
  const delay =
    parseRetryAfter(response.headers?.['retry-after']) ??
    Math.min(FIRST_RETRY_DELAY * 2 ** (attempt - 1), MAX_RETRY_DELAY);
  return new IconLoadError(message, attempt, Date.now() + delay);
}

/** A displayed icon whose load failed */
export type FailedIcon = {
  /** whether the failure is retried on its own (and when the browser comes back online) */
  transient: boolean;
  /** loads the icon again; `fresh` restarts the delay sequence at its first step */
  retry: (fresh: boolean) => void;
};

const failedIcons = new Set<FailedIcon>();
let listeningOnline = false;

const retryTransient = () => [...failedIcons].filter((icon) => icon.transient).forEach((icon) => icon.retry(false));

/**
 * Registers a displayed icon whose load failed, so that retryFailedIcons and the browser's online event reach it
 * @returns function unregistering the icon
 */
export function registerFailedIcon(icon: FailedIcon): () => void {
  failedIcons.add(icon);
  // added on first use rather than at import, so that importing this module during server-side rendering does not
  // touch window
  if (!listeningOnline) {
    window.addEventListener('online', retryTransient);
    listeningOnline = true;
  }
  return () => failedIcons.delete(icon);
}

/**
 * Forgets every failed load, permanent ones included, and loads the displayed failed icons again right away. Call it
 * when requests that failed may now succeed, e.g. after the user logs in.
 */
export function retryFailedIcons() {
  globalCache.clearFailures();
  [...failedIcons].forEach((icon) => icon.retry(true));
}
