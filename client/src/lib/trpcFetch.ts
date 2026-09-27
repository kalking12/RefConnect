const READ_TIMEOUT_MS = 90_000;

/** Bound read requests while leaving writes alone: a timed-out write may still commit. */
export async function fetchTrpc(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: typeof fetch = globalThis.fetch,
  readTimeoutMs = READ_TIMEOUT_MS
): Promise<Response> {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const options: RequestInit = { ...init, credentials: "include" };
  if (method !== "GET") return fetcher(input, options);

  const controller = new AbortController();
  const callerSignal = init?.signal;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timer = setTimeout(
    () => controller.abort(new DOMException("Loading timed out. Check your connection and try again.", "TimeoutError")),
    readTimeoutMs
  );
  try {
    return await fetcher(input, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
