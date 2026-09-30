import { describe, expect, it } from "vitest";
import { reconcileReferral, referralHandoffId } from "./db";

const requestId = "797d9e14-510e-4549-9f52-08c97eb067ec";
const tuple = { profileId: "demo-profile", destinationHospitalId: "akth", surgeryTypeId: "cabg" };
const committed = { id: "ref_123", ...tuple, status: "prepared" as const };

describe("referral retry identity", () => {
  it("derives one stable database key for every retry by the same user", () => {
    const id = referralHandoffId(12, requestId);
    expect(id).toMatch(/^ref_[a-f0-9]{64}$/);
    expect(referralHandoffId(12, requestId.toUpperCase())).toBe(id);
    expect(referralHandoffId(13, requestId)).not.toBe(id);
    expect(referralHandoffId(12, "797d9e14-510e-4549-9f52-08c97eb067ed")).not.toBe(id);
  });

  it("returns an already committed handoff without creating a second one", () => {
    expect(reconcileReferral(committed, tuple)).toEqual({ id: committed.id, status: "prepared" });
    expect(reconcileReferral({ ...committed, status: "sent" }, tuple)).toEqual({ id: committed.id, status: "sent" });
  });

  it("refuses to reuse the same attempt for a different tuple", () => {
    expect(() => reconcileReferral(committed, { ...tuple, profileId: "someone-else" })).toThrow("another selection");
    expect(() => reconcileReferral(committed, { ...tuple, destinationHospitalId: "other" })).toThrow("another selection");
    expect(() => reconcileReferral(committed, { ...tuple, surgeryTypeId: "tracheostomy" })).toThrow("another selection");
  });
});
