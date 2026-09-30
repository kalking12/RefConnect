import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { validateReferralEligibility, validateReferralProcedure } from "../shared/referral";
import { PROCEDURE_SPECIALTIES, SURGERY_TYPES } from "../shared/readiness";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 42, openId: "test-user", googleSub: "sub-42", pictureUrl: null, name: "Test User", email: "test@example.com", loginMethod: "google", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("administrator data access", () => {
  it("rejects capability updates from a regular user before a data write occurs", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.updateCapabilities({ hospitalId: "akth", capabilities: { electricity: 2 } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an old administrator role belonging to another email", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.admin.updateHospitalProfile({ hospitalId: "akth", grade: 3, facilityLevel: "Tertiary", ownership: "Public", description: "Hospital profile" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("referral validation", () => {
  it("requires authentication to list profiles or create referrals", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.showcase.hospitals()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.showcase.profiles()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.showcase.createReferral({ profileId: "profile-1", destinationHospitalId: "akth", surgeryTypeId: "cancer-surgery" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires an active stored profile and active destination facility", () => {
    const demoProfile = { id: "demo-1", active: true, isDemonstration: true };
    const illustrativeHospital = { id: 1, active: true, isIllustrative: true };
    expect(() => validateReferralEligibility(null, illustrativeHospital)).toThrow("pre-registered patient profile");
    expect(() => validateReferralEligibility(demoProfile, { ...illustrativeHospital, active: false })).toThrow("active destination hospital");
    expect(() => validateReferralEligibility(demoProfile, illustrativeHospital)).not.toThrow();
  });

  it("never saves real patient details against an illustrative hospital", () => {
    const realProfile = { id: "patient-1", active: true, isDemonstration: false };
    const illustrativeHospital = { id: 1, active: true, isIllustrative: true };
    expect(() => validateReferralEligibility(realProfile, illustrativeHospital))
      .toThrow("a real patient profile needs verified hospital data");
    expect(() => validateReferralEligibility(realProfile, { ...illustrativeHospital, isIllustrative: false }))
      .not.toThrow();
  });

  it("rejects malformed referral requests before attempting a handoff", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.showcase.createReferral({ profileId: "", destinationHospitalId: "akth", surgeryTypeId: "cancer-surgery" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not claim a referral was prepared when the database is unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "");
    try {
      const caller = appRouter.createCaller(contextFor("user"));
      await expect(caller.showcase.createReferral({ profileId: "showcase-referral-profile", destinationHospitalId: "akth", surgeryTypeId: "cabg" }))
        .rejects.toThrow("Database is unavailable. Referral handoff could not be prepared.");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("accepts a selectable active procedure from every specialty and rejects retired procedure identifiers", () => {
    PROCEDURE_SPECIALTIES.forEach((specialty) => {
      const procedure = SURGERY_TYPES.find((item) => item.specialty === specialty);
      expect(procedure).toBeDefined();
      expect(() => validateReferralProcedure({ id: procedure!.id, active: true })).not.toThrow();
    });
    expect(() => validateReferralProcedure({ id: "lung-transplant", active: false })).toThrow("active procedure");
  });
});
