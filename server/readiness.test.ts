import { describe, expect, it } from "vitest";
import { CAPABILITY_DEFINITIONS, calculateReadiness, capabilityLabel, PROCEDURE_SPECIALTIES, readinessTier, SURGERY_TYPES } from "../shared/readiness";
import { ACTIVE_SHOWCASE_HOSPITALS } from "../shared/showcaseData";

describe("readiness scoring engine", () => {
  const cabgWeights = SURGERY_TYPES[0].weights;

  it("returns 100 percent when all weighted requirements are available", () => {
    const complete = Object.fromEntries(Object.keys(cabgWeights).map((key) => [key, 2]));
    expect(calculateReadiness(complete, cabgWeights)).toBe(100);
  });

  it("returns zero when requirements are absent", () => {
    expect(calculateReadiness({}, cabgWeights)).toBe(0);
  });

  it("weights specialist availability above a lower-weight supporting factor for CABG", () => {
    expect(calculateReadiness({ specialistSurgeon: 2 }, cabgWeights)).toBeGreaterThan(calculateReadiness({ pathology: 2 }, cabgWeights));
  });

  it("contains the full 50-procedure catalogue with the requested specialty distribution", () => {
    expect(CAPABILITY_DEFINITIONS).toHaveLength(22);
    expect(SURGERY_TYPES).toHaveLength(50);
    expect(PROCEDURE_SPECIALTIES).toEqual(["Cardiac & Vascular", "Oncology", "Neurosurgery", "Orthopaedic & Trauma", "General & Abdominal Surgery", "Urology & Renal", "Obstetrics/Gynecology & ENT"]);
    expect(SURGERY_TYPES.filter((procedure) => procedure.specialty === "Cardiac & Vascular")).toHaveLength(10);
    expect(SURGERY_TYPES.filter((procedure) => procedure.specialty === "Oncology")).toHaveLength(10);
    expect(SURGERY_TYPES.filter((procedure) => procedure.specialty === "Neurosurgery")).toHaveLength(7);
    expect(SURGERY_TYPES.filter((procedure) => procedure.specialty === "Orthopaedic & Trauma")).toHaveLength(8);
    expect(SURGERY_TYPES.filter((procedure) => procedure.specialty === "General & Abdominal Surgery")).toHaveLength(6);
    expect(SURGERY_TYPES.filter((procedure) => procedure.specialty === "Urology & Renal")).toHaveLength(5);
    expect(SURGERY_TYPES.filter((procedure) => procedure.specialty === "Obstetrics/Gynecology & ENT")).toHaveLength(4);
  });

  it("normalizes every procedure-specific factor profile to 100 points", () => {
    SURGERY_TYPES.forEach((procedure) => expect(Object.values(procedure.weights).reduce((sum, weight) => sum + weight, 0)).toBe(100));
    expect(SURGERY_TYPES.find((procedure) => procedure.id === "cabg")?.weights).not.toEqual(SURGERY_TYPES.find((procedure) => procedure.id === "pacemaker-insertion")?.weights);
  });

  it("provides selectable pathways for comparison and referral across every specialty", () => {
    const crossSpecialtyIds = ["cabg", "whipple-procedure", "brain-tumor-surgery", "hip-replacement", "laparotomy", "kidney-transplant", "caesarean-section", "tracheostomy"];
    crossSpecialtyIds.forEach((procedureId) => {
      const procedure = SURGERY_TYPES.find((item) => item.id === procedureId);
      expect(procedure).toBeDefined();
      expect(procedure?.specialty).toBeDefined();
      expect(Object.values(procedure?.weights ?? {}).reduce((sum, weight) => sum + weight, 0)).toBe(100);
    });
  });

  it("calculates a bounded readiness score for every active hospital and procedure combination", () => {
    const allScores = ACTIVE_SHOWCASE_HOSPITALS.flatMap((hospital) => SURGERY_TYPES.map((procedure) => calculateReadiness(hospital.capabilities, procedure.weights)));
    expect(allScores).toHaveLength(250);
    allScores.forEach((score) => expect(score).toBeGreaterThanOrEqual(0));
    allScores.forEach((score) => expect(score).toBeLessThanOrEqual(100));
  });

  it("provides stable presentation labels at readiness thresholds", () => {
    expect(readinessTier(80).label).toBe("Ready");
    expect(readinessTier(50).label).toBe("Conditional");
    expect(readinessTier(49).label).toBe("Not equipped");
    expect(capabilityLabel(2)).toBe("Available");
  });
});
