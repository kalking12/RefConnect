import { describe, expect, it } from "vitest";
import { calculateReadiness, capabilityLabel, readinessTier, SURGERY_TYPES } from "./readiness";

describe("calculateReadiness", () => {
  const cancerWeights = SURGERY_TYPES[0].weights;

  it("returns 100 percent when every procedure requirement is available", () => {
    const complete = Object.fromEntries(Object.keys(cancerWeights).map((key) => [key, 2]));
    expect(calculateReadiness(complete, cancerWeights)).toBe(100);
  });

  it("returns zero when no procedure requirements are available", () => {
    expect(calculateReadiness({}, cancerWeights)).toBe(0);
  });

  it("gives specialist staffing more score influence than a lower-weight factor", () => {
    const staffingOnly = calculateReadiness({ specialistSurgeon: 2 }, cancerWeights);
    const pathologyOnly = calculateReadiness({ pathology: 2 }, cancerWeights);
    expect(staffingOnly).toBeGreaterThan(pathologyOnly);
  });
});

describe("readiness presentation helpers", () => {
  it("assigns the appropriate readiness tier at each threshold", () => {
    expect(readinessTier(80).label).toBe("Ready");
    expect(readinessTier(50).label).toBe("Conditional");
    expect(readinessTier(49).label).toBe("Not equipped");
  });

  it("labels capability levels consistently", () => {
    expect(capabilityLabel(2)).toBe("Available");
    expect(capabilityLabel(1)).toBe("Limited");
    expect(capabilityLabel(0)).toBe("Unavailable");
  });
});
