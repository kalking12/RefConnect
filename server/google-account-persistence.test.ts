import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { SQL } from "drizzle-orm";

const database = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => database }));

import { listVerifiedGoogleUsers, setGoogleUserAdmin, upsertGoogleUser } from "./db";

const email = "person@example.com";
const input = { googleSub: "stable-google-sub", name: "Person", email, pictureUrl: null };

beforeEach(() => {
  process.env.DATABASE_URL = "mysql://test-only";
  vi.clearAllMocks();
});

describe("Google account persistence", () => {
  it("creates a fresh Google account after searching only by stable subject", async () => {
    const where = vi.fn(() => ({ limit: vi.fn(async () => []) }));
    database.select.mockReturnValue({ from: () => ({ where }) });
    const values = vi.fn(async () => undefined);
    database.insert.mockReturnValue({ values });

    await expect(upsertGoogleUser(input)).resolves.toMatchObject({
      openId: "google:stable-google-sub", role: "user",
    });

    expect(database.select).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
    const condition = where.mock.calls[0][0] as { queryChunks: Array<{ name?: string }> };
    expect(condition.queryChunks.some((chunk) => chunk.name === "googleSub")).toBe(true);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      openId: "google:stable-google-sub", googleSub: "stable-google-sub", email,
      loginMethod: "google", role: "user",
    }));
    expect(database.update).not.toHaveBeenCalled();
  });

  it("preserves an owner-approved admin grant on the same verified Google identity", async () => {
    const approval = new Date("2026-01-01T00:00:00Z");
    const oldAccount = { id: 22, openId: "google:stable-google-sub", googleSub: "stable-google-sub", email, loginMethod: "google", role: "admin", adminApprovedAt: approval };
    database.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [oldAccount] }) }) });
    const set = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
    database.update.mockReturnValue({ set });

    await expect(upsertGoogleUser(input)).resolves.toMatchObject({ openId: oldAccount.openId, role: "admin" });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      googleSub: "stable-google-sub", email, loginMethod: "google",
    }));
    expect(set.mock.calls[0][0]).not.toHaveProperty("role");
    expect(set.mock.calls[0][0]).not.toHaveProperty("adminApprovedAt");
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("does not reactivate a legacy admin row without an owner-issued grant", async () => {
    const oldAccount = { id: 22, openId: "google:stable-google-sub", googleSub: "stable-google-sub", email, loginMethod: "google", role: "admin", adminApprovedAt: null };
    database.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [oldAccount] }) }) });
    const set = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
    database.update.mockReturnValue({ set });

    await expect(upsertGoogleUser(input)).resolves.toMatchObject({ role: "user" });
    expect(set.mock.calls[0][0]).not.toHaveProperty("role");
    expect(set.mock.calls[0][0]).not.toHaveProperty("adminApprovedAt");
  });

  it("removes a previously approved grant when the Google account changes email", async () => {
    const oldAccount = { id: 22, openId: "google:stable-google-sub", googleSub: "stable-google-sub", email: "old@example.com", loginMethod: "google", role: "admin", adminApprovedAt: new Date() };
    database.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [oldAccount] }) }) });
    const set = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
    database.update.mockReturnValue({ set });

    await expect(upsertGoogleUser(input)).resolves.toMatchObject({ role: "user" });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ role: "user", adminApprovedAt: null }));
  });

  it("does not restore a grant revoked concurrently with an ordinary sign-in", async () => {
    const row = { id: 22, openId: "google:stable-google-sub", googleSub: input.googleSub, email, loginMethod: "google", role: "admin", adminApprovedAt: new Date() };
    database.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [row] }) }) });
    database.update.mockReturnValue({ set: (values: Partial<typeof row>) => ({ where: async () => {
      row.role = "user";
      row.adminApprovedAt = null!;
      Object.assign(row, values);
    } }) });

    await upsertGoogleUser(input);
    expect(row.role).toBe("user");
    expect(row.adminApprovedAt).toBeNull();
  });
});

describe("owner-approved administrator grants", () => {
  it("persists promotion and revocation on a specific verified account ID", async () => {
    const row = { id: 22, openId: "google:stable-google-sub", googleSub: input.googleSub, name: input.name,
      email, pictureUrl: null, loginMethod: "google", role: "user" as "user" | "admin", adminApprovedAt: null as Date | null,
      lastSignedIn: new Date() };
    const conditions: unknown[] = [];
    database.select.mockImplementation(() => ({ from: () => ({ where: (condition: unknown) => {
      conditions.push(condition);
      return { limit: async () => [row] };
    } }) }));
    const set = vi.fn((values: Partial<typeof row>) => ({ where: async () => { Object.assign(row, values); } }));
    database.update.mockReturnValue({ set });

    await expect(setGoogleUserAdmin(22, true)).resolves.toMatchObject({ account: { id: 22, role: "admin", isOwner: false } });
    expect(row.adminApprovedAt).toBeInstanceOf(Date);
    await expect(setGoogleUserAdmin(22, false)).resolves.toMatchObject({ account: { id: 22, role: "user", isOwner: false } });
    expect(row.adminApprovedAt).toBeNull();
    expect(conditions.length).toBe(4);
    const whereSql = new MySqlDialect().sqlToQuery(conditions[0] as SQL).sql;
    for (const name of ["id", "loginMethod", "googleSub", "email"]) {
      expect(whereSql).toContain(`\`users\`.\`${name}\``);
    }
  });

  it("never demotes the founding owner", async () => {
    database.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ id: 1, googleSub: "owner-sub", email: "Osinusikalid@GMAIL.COM", loginMethod: "google", role: "user" }] }) }) });
    await expect(setGoogleUserAdmin(1, false)).resolves.toEqual({ error: "owner" });
    expect(database.update).not.toHaveBeenCalled();
  });

  it("reports a concurrent role change rather than claiming promotion succeeded", async () => {
    const row = { id: 22, openId: "google:stable-google-sub", googleSub: input.googleSub, name: input.name,
      email, pictureUrl: null, loginMethod: "google", role: "user", adminApprovedAt: null, lastSignedIn: new Date() };
    database.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [row] }) }) });
    database.update.mockReturnValue({ set: () => ({ where: async () => undefined }) });
    await expect(setGoogleUserAdmin(22, true)).resolves.toEqual({ error: "conflict" });
  });

  it("rejects a missing user or a legacy account even if it has an email", async () => {
    database.select.mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [] }) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [{ id: 22, email, googleSub: input.googleSub, loginMethod: "legacy" }] }) }) });
    await expect(setGoogleUserAdmin(999, true)).resolves.toBeNull();
    await expect(setGoogleUserAdmin(22, true)).resolves.toBeNull();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("lists only verified Google accounts and presents stale legacy roles as users", async () => {
    const lastSignedIn = new Date();
    const rows = [
      { id: 1, name: "Fresh", email, googleSub: input.googleSub, pictureUrl: null, loginMethod: "google", role: "admin", adminApprovedAt: null, lastSignedIn },
      { id: 2, name: "Legacy", email: "legacy@example.com", googleSub: "legacy-sub", pictureUrl: null, loginMethod: "legacy", role: "admin", adminApprovedAt: new Date(), lastSignedIn },
    ];
    database.select.mockReturnValue({ from: () => ({ where: () => rows }) });
    await expect(listVerifiedGoogleUsers()).resolves.toEqual([{ id: 1, name: "Fresh", email, pictureUrl: null, role: "user", isOwner: false, lastSignedIn }]);
  });
});
