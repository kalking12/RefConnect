import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, ShieldCheck, UserRoundCog } from "lucide-react";
import { useMemo, useState } from "react";

type PendingChange = { userId: number; email: string; makeAdmin: boolean };

export function AdminRoleManagement() {
  const usersQuery = trpc.admin.listUsers.useQuery();
  const setUserAdmin = trpc.admin.setUserAdmin.useMutation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(
    null
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const ownerAccessChanged = usersQuery.error?.data?.code === "FORBIDDEN";

  const users = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase();
    return (usersQuery.data ?? [])
      .filter(
        user =>
          !searchText ||
          `${user.name ?? ""} ${user.email ?? ""}`
            .toLocaleLowerCase()
            .includes(searchText)
      )
      .sort(
        (first, second) =>
          Number(second.isOwner) - Number(first.isOwner) ||
          Number(second.role === "admin") - Number(first.role === "admin") ||
          (first.email ?? "").localeCompare(second.email ?? "")
      );
  }, [usersQuery.data, search]);

  const confirmChange = async () => {
    if (!pendingChange || setUserAdmin.isPending) return;
    const change = pendingChange;
    setError("");
    setStatus("");
    try {
      const updatedAccount = await setUserAdmin.mutateAsync({
        userId: change.userId,
        isAdmin: change.makeAdmin,
      });
      utils.admin.listUsers.setData(undefined, previous =>
        previous?.map(account =>
          account.id === updatedAccount.id ? updatedAccount : account
        )
      );
      setPendingChange(null);
      setStatus(
        change.makeAdmin
          ? `${change.email} now has administrator access.`
          : `Administrator access removed for ${change.email}.`
      );
      await Promise.allSettled([
        utils.admin.listUsers.invalidate(),
        utils.auth.me.invalidate(),
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error &&
          "data" in cause &&
          cause.data &&
          typeof cause.data === "object" &&
          "code" in cause.data
          ? cause.message
          : "The role change could not be confirmed. Reconnect, close this dialog, and reload the page to check the account before trying again."
      );
    }
  };

  return (
    <section
      className="surface-shadow mb-6 overflow-hidden rounded-2xl border border-[#d7e4df] bg-white"
      aria-labelledby="role-management-title"
    >
      <div className="flex flex-col gap-4 border-b border-[#e6eeeb] px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#0b746b]">
            Owner controls
          </p>
          <h2
            id="role-management-title"
            className="mt-2 font-display text-2xl text-[#1c4038]"
          >
            Administrator roles
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#496b60]">
            Grant access to edit hospital values after a person signs in with a
            verified Google account. Only the owner can change roles.
          </p>
        </div>
        <label className="relative block w-full shrink-0 sm:w-64">
          <span className="sr-only">Search accounts by name or email</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#759187]"
          />
          <Input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search accounts"
            className="h-11 border-[#d5e4de] pl-9"
          />
        </label>
      </div>
      {status && (
        <p
          role="status"
          className="mx-5 mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {status}
        </p>
      )}
      {error && !pendingChange && (
        <p
          role="alert"
          className="mx-5 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      {usersQuery.isPending ? (
        <p className="px-5 py-6 text-sm text-[#496b60]" role="status">
          {usersQuery.isPaused
            ? "Waiting for a connection to load accounts."
            : "Loading accounts…"}
        </p>
      ) : usersQuery.error ? (
        <div className="px-5 py-6 text-sm text-rose-700" role="alert">
          {ownerAccessChanged
            ? "Your owner access has changed. Refresh the page to see your current permissions."
            : "Accounts could not be loaded. Check your connection and try again."}{" "}
          {ownerAccessChanged ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b746b]"
            >
              Refresh page
            </button>
          ) : (
            <button
              type="button"
              onClick={() => usersQuery.refetch()}
              className="inline-flex min-h-11 items-center font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b746b]"
            >
              Try again
            </button>
          )}
        </div>
      ) : !users.length ? (
        <p className="px-5 py-6 text-sm text-[#496b60]">
          {search
            ? "No accounts match that search."
            : "No verified accounts have signed in yet."}
        </p>
      ) : (
        <ul className="divide-y divide-[#edf2ef]">
          {users.map(account => (
            <li
              key={account.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#244940]">
                  {account.name || account.email || `Account ${account.id}`}
                </p>
                {account.name && (
                  <p className="truncate text-sm text-[#496b60]">
                    {account.email}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${account.isOwner ? "bg-[#e1f4ec] text-[#176552] dark:bg-[#203a33]" : account.role === "admin" ? "bg-[#e9f3f5] text-[#2a6974] dark:bg-[#1c3540]" : "bg-[#f1f5f2] text-[#496b60] dark:bg-[#26312d]"}`}
                >
                  {account.isOwner && (
                    <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {account.isOwner
                    ? "Owner"
                    : account.role === "admin"
                      ? "Administrator"
                      : "Member"}
                </span>
                {account.isOwner ? (
                  <span className="w-[140px] text-center text-sm text-[#496b60]">
                    Protected account
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`${account.role === "admin" ? "Remove admin from" : "Make admin"} ${account.name || account.email || `Account ${account.id}`}`}
                    className="min-h-11 w-[140px] border-[#c8ded5] text-sm text-[#28594d]"
                    onClick={() => {
                      setError("");
                      setPendingChange({
                        userId: account.id,
                        email: account.email ?? `Account ${account.id}`,
                        makeAdmin: account.role !== "admin",
                      });
                    }}
                  >
                    {account.role === "admin" ? "Remove admin" : "Make admin"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={pendingChange !== null}
        onOpenChange={open => {
          if (!open && !setUserAdmin.isPending) {
            setPendingChange(null);
            setError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f5ee] text-[#176552] dark:bg-[#203a33]">
              <UserRoundCog aria-hidden="true" className="h-5 w-5" />
            </div>
            <DialogTitle>
              {pendingChange?.makeAdmin
                ? "Grant administrator access?"
                : "Remove administrator access?"}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {pendingChange?.email}{" "}
              {pendingChange?.makeAdmin
                ? "will be able to edit hospital capability and profile values. Only the owner can change roles."
                : "will lose access to edit hospital capability and profile values."}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={setUserAdmin.isPending}
              onClick={() => {
                setPendingChange(null);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={setUserAdmin.isPending}
              onClick={confirmChange}
              className="min-h-11 bg-[#0b746b] text-white hover:bg-[#075d57]"
            >
              {setUserAdmin.isPending
                ? "Saving…"
                : pendingChange?.makeAdmin
                  ? "Grant access"
                  : "Remove access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
