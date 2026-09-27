import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    // A brief connection drop should not turn a valid session into a sign-in
    // prompt. A signed-out account returns null, so it is never retried.
    retry: 1,
    retryDelay: 1000,
    // Role changes are server-side. Recheck when someone returns to the app so
    // newly promoted or revoked administrators see their current permissions.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    // Keep the verified session visible if the request never reached the
    // server. Only the successful mutation clears the cached account.
    await logoutMutation.mutateAsync();
    await utils.auth.me.invalidate();
  }, [logoutMutation, utils]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      // React Query pauses an initial request while offline. In that state
      // isLoading is false, but the session has not been checked yet.
      sessionPaused: meQuery.isPending && meQuery.fetchStatus === "paused",
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [
      meQuery.data,
      meQuery.error,
      meQuery.isLoading,
      meQuery.isPending,
      meQuery.fetchStatus,
      logoutMutation.error,
      logoutMutation.isPending,
    ],
  );

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
