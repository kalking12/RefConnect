import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTrpc } from "./trpcFetch";

afterEach(() => vi.useRealTimers());

function pendingFetch(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  });
}

describe("tRPC transport on a weak connection", () => {
  it("times out a stalled read so the query can show an error", async () => {
    vi.useFakeTimers();
    const request = fetchTrpc("/api/trpc/auth.me", { method: "GET" }, pendingFetch, 50);
    const rejection = expect(request).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(50);
    await rejection;
  });

  it("preserves caller cancellation for read requests", async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const request = fetchTrpc("/api/trpc/auth.me", { method: "GET", signal: caller.signal }, pendingFetch, 500);
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    caller.abort(new DOMException("Navigation cancelled", "AbortError"));
    await rejection;
  });

  it("does not abort a write whose result could still commit on the server", async () => {
    vi.useFakeTimers();
    let complete!: (response: Response) => void;
    const fetcher = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>(resolve => { complete = resolve; })
    );
    const request = fetchTrpc("/api/trpc/showcase.createReferral", { method: "POST" }, fetcher, 50);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.signal).toBeUndefined();
    complete(new Response("ok"));
    await expect(request).resolves.toBeInstanceOf(Response);
  });
});
