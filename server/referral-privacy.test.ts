import { describe, expect, it } from "vitest";
import { buildPreparedReferralInsert } from "./db";

describe("prepared referral data minimization", () => {
  it("does not duplicate patient identity or condition in the handoff row", () => {
    const profile = {
      id: "profile-123",
      sourceHospitalId: 7,
      displayName: "Sensitive Patient Name",
      patientReference: "PRIVATE-REF-123",
      conditionSummary: "Private health condition",
    };

    const handoff = buildPreparedReferralInsert(profile, 9, "cabg");
    expect(handoff).toMatchObject({
      profileId: "profile-123",
      sourceHospitalId: 7,
      destinationHospitalId: 9,
      surgeryTypeId: "cabg",
      profileSnapshot: "{}",
      status: "prepared",
    });
    const persistedData = JSON.stringify(handoff);
    for (const privateValue of [profile.displayName, profile.patientReference, profile.conditionSummary]) {
      expect(persistedData).not.toContain(privateValue);
    }
  });
});
