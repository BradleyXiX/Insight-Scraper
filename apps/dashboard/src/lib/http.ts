/** Free hosting sleeps when idle; a wake-up can take a minute, but not forever. */
export const REQUEST_TIMEOUT_MS = 75_000;

/**
 * `fetch` with a deadline.
 *
 * Render's free tier suspends the API after inactivity; the first request after
 * a sleep waits for the process to boot. Without a signal that wait is unbounded,
 * so the button spins forever and the visitor cannot tell a slow boot from a
 * broken service.
 */
export function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
