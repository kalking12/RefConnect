import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  createReferral: vi.fn(async () => ({ id: "prepared-referral", status: "prepared" as const })),
}));

vi.mock("./db", () => ({
  createReferral: mocks.createReferral,
  listHospitalReadiness: vi.fn(),
  listPatientProfiles: vi.fn(),
  updateHospitalCapabilities: vi.fn(),
  updateHospitalProfile: vi.fn(),
}));

import { appRouter } from "./routers";

function userContext(): TrpcContext {
  return {
    user: { id: 41, openId: "referral-test", googleSub: "referral-google-sub", pictureUrl: null, name: "Referral Test", email: "referral@example.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("cross-specialty referral procedure contract", () => {
  it("forwards the selected current procedure unchanged from the referral request to the handoff layer", async () => {
    const caller = appRouter.createCaller(userContext());
    const selectedProcedures = ["cabg", "whipple-procedure", "brain-tumor-surgery", "hip-replacement", "kidney-transplant", "caesarean-section", "tracheostomy"];

    for (const [index, surgeryTypeId] of selectedProcedures.entries()) {
      const requestId = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      await expect(caller.showcase.createReferral({ profileId: "showcase-referral-profile", destinationHospitalId: "akth", surgeryTypeId, requestId })).resolves.toEqual({ id: "prepared-referral", status: "prepared" });
    }

    expect(mocks.createReferral).toHaveBeenCalledTimes(selectedProcedures.length);
    selectedProcedures.forEach((surgeryTypeId, index) => {
      const requestId = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      expect(mocks.createReferral).toHaveBeenCalledWith("showcase-referral-profile", "akth", surgeryTypeId, 41, requestId);
    });
  });
});
