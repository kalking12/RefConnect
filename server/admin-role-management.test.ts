import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import type { User } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  listVerifiedGoogleUsers: vi.fn(),
  setGoogleUserAdmin: vi.fn(),
  updateHospitalProfile: vi.fn(),
  updateHospitalCapabilities: vi.fn(),
}));
vi.mock("./db", () => ({
  ...mocks,
  createReferral: vi.fn(),
  listHospitalReadiness: vi.fn(),
  listPatientProfiles: vi.fn(),
}));

import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { appRouter } from "./routers";

const ownerEmail = "osinusikalid@gmail.com";
const approvedAt = new Date("2026-09-27T00:00:00Z");
const base: User = {
  id: 12, openId: "google:sub-12", googleSub: "sub-12", email: "another@example.com",
  name: "Another account", pictureUrl: null, loginMethod: "google", role: "user",
  adminApprovedAt: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function context(user: User | null): TrpcContext {
  return { user, req: {
    get(name: string) { return name.toLowerCase() === "origin" ? "https://refconnect.test" : name.toLowerCase() === "host" ? "refconnect.test" : undefined; },
  } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("administrator role management", () => {
  it("recognizes the verified founding owner even if an old row has role=user", async () => {
    const owner = { ...base, email: ownerEmail.toUpperCase(), role: "user" as const };
    const users = [{ id: owner.id, name: owner.name, email: owner.email, role: "admin", isOwner: true }];
    mocks.listVerifiedGoogleUsers.mockResolvedValue(users);
    const caller = appRouter.createCaller(context(owner));
    await expect(caller.auth.me()).resolves.toMatchObject({ role: "admin", isOwner: true });
    await expect(caller.admin.listUsers()).resolves.toEqual(users);
  });

  it("lets an approved admin edit values, but never manage other admins", async () => {
    const admin = { ...base, role: "admin" as const, adminApprovedAt: approvedAt };
    mocks.updateHospitalProfile.mockResolvedValue([]);
    const caller = appRouter.createCaller(context(admin));
    await expect(caller.auth.me()).resolves.toMatchObject({ role: "admin", isOwner: false });
    await caller.admin.updateHospitalProfile({ hospitalId: "akth", grade: 3, facilityLevel: "Tertiary", ownership: "Public", description: "Hospital profile" });
    expect(mocks.updateHospitalProfile).toHaveBeenCalledOnce();
    await expect(caller.admin.listUsers()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setUserAdmin({ userId: 14, isAdmin: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.setGoogleUserAdmin).not.toHaveBeenCalled();
  });

  it("rejects blank hospital fields and trims valid values before saving", async () => {
    const admin = { ...base, role: "admin" as const, adminApprovedAt: approvedAt };
    const caller = appRouter.createCaller(context(admin));
    const input = { hospitalId: "akth", grade: 3, facilityLevel: "Tertiary", ownership: "Public", description: "Hospital profile" };

    for (const field of ["facilityLevel", "ownership", "description"] as const) {
      await expect(caller.admin.updateHospitalProfile({ ...input, [field]: "   " }))
        .rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(mocks.updateHospitalProfile).not.toHaveBeenCalled();

    mocks.updateHospitalProfile.mockResolvedValue([]);
    await caller.admin.updateHospitalProfile({
      ...input,
      facilityLevel: "  Tertiary  ",
      ownership: "  Public  ",
      description: "  Hospital profile  ",
    });
    expect(mocks.updateHospitalProfile).toHaveBeenCalledWith("akth", input);
  });

  it("blocks stale Manus admin rows and legacy Google-looking rows", async () => {
    for (const user of [
      { ...base, role: "admin" as const, adminApprovedAt: null },
      { ...base, role: "admin" as const, adminApprovedAt: approvedAt, loginMethod: "legacy" },
      { ...base, role: "admin" as const, adminApprovedAt: approvedAt, googleSub: null },
    ]) {
      const caller = appRouter.createCaller(context(user));
      await expect(caller.auth.me()).resolves.toMatchObject({ role: "user", isOwner: false });
      await expect(caller.admin.updateCapabilities({ hospitalId: "akth", capabilities: { electricity: 2 } })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.listUsers()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("lets the owner promote and revoke by user ID and rejects owner demotion", async () => {
    const owner = { ...base, id: 1, email: ownerEmail, role: "admin" as const };
    const caller = appRouter.createCaller(context(owner));
    mocks.setGoogleUserAdmin.mockResolvedValueOnce({ account: { id: 12, role: "admin", isOwner: false } })
      .mockResolvedValueOnce({ account: { id: 12, role: "user", isOwner: false } })
      .mockResolvedValueOnce({ error: "owner" });
    await expect(caller.admin.setUserAdmin({ userId: 12, isAdmin: true })).resolves.toMatchObject({ role: "admin" });
    await expect(caller.admin.setUserAdmin({ userId: 12, isAdmin: false })).resolves.toMatchObject({ role: "user" });
    await expect(caller.admin.setUserAdmin({ userId: 1, isAdmin: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.setGoogleUserAdmin).toHaveBeenNthCalledWith(1, 12, true);
    expect(mocks.setGoogleUserAdmin).toHaveBeenNthCalledWith(2, 12, false);
  });

  it("rejects a role-changing POST from a different origin", async () => {
    const owner = { ...base, email: ownerEmail };
    const forged = context(owner);
    forged.req.get = (name: string) => name.toLowerCase() === "origin" ? "https://foreign.example" : "refconnect.test";
    await expect(appRouter.createCaller(forged).admin.setUserAdmin({ userId: 12, isAdmin: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.setGoogleUserAdmin).not.toHaveBeenCalled();
  });

  it("uses the current database role for an existing signed cookie on the next request", async () => {
    const formerSecret = ENV.cookieSecret;
    ENV.cookieSecret = "test-only-random-secret-at-least-32-bytes-long";
    let persisted: User = { ...base, role: "admin", adminApprovedAt: approvedAt };
    mocks.getUserByOpenId.mockImplementation(async () => persisted);
    try {
      const token = await sdk.createSessionToken(base.openId, { googleSub: base.googleSub!, name: base.name! });
      const req = { headers: { cookie: `${COOKIE_NAME}=${token}` } } as TrpcContext["req"];
      const first = await sdk.authenticateRequest(req);
      await expect(appRouter.createCaller(context(first)).auth.me()).resolves.toMatchObject({ role: "admin" });

      persisted = { ...persisted, role: "user", adminApprovedAt: null };
      const nextRequest = await sdk.authenticateRequest(req);
      await expect(appRouter.createCaller(context(nextRequest)).admin.updateCapabilities({ hospitalId: "akth", capabilities: { electricity: 2 } })).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mocks.updateHospitalCapabilities).not.toHaveBeenCalled();
      expect(mocks.getUserByOpenId).toHaveBeenCalledTimes(2);
    } finally {
      ENV.cookieSecret = formerSecret;
    }
  });
});
