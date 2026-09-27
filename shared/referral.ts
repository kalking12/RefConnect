export type ReferralProfileStatus = { id: string; active: boolean; isDemonstration: boolean } | null | undefined;
export type ReferralDestinationStatus = { id: number; active: boolean; isIllustrative: boolean } | null | undefined;
export type ActiveProcedureStatus = { id: string; active: boolean } | null | undefined;

/** Keeps referral creation from proceeding without an active stored profile and active receiving facility. */
export function validateReferralEligibility(profile: ReferralProfileStatus, destination: ReferralDestinationStatus) {
  if (!profile?.active) throw new Error("A valid pre-registered patient profile is required.");
  if (!destination?.active) throw new Error("An active destination hospital is required.");
  if (!profile.isDemonstration && destination.isIllustrative) {
    throw new Error("This hospital uses illustrative readiness data. Use the demonstration profile for a demo referral; a real patient profile needs verified hospital data.");
  }
}

/** Prevents a referral handoff from carrying a retired or unknown procedure identifier. */
export function validateReferralProcedure(procedure: ActiveProcedureStatus) {
  if (!procedure?.active) throw new Error("A valid active procedure is required for referral.");
}
