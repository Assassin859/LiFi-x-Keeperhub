/** Shared fetch with a hard timeout (ms). */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 30_000,
): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(input, { ...init, signal });
}
