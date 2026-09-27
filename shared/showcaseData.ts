import type { CapabilityValues } from "./readiness";

export type ShowcaseHospitalSeed = {
  id: string;
  name: string;
  shortName: string;
  ownership: string;
  facilityLevel: string;
  grade: number | null;
  lga: string;
  ward: string | null;
  latitude: string | null;
  longitude: string | null;
  description: string;
  sourceNote: string;
  capabilities: CapabilityValues;
};

/**
 * Active facility capabilities are illustrative showcase values inferred from
 * the supplied institutional profiles. They are intentionally editable only
 * through the administrator workspace and are not verified clinical advice.
 */
export const ACTIVE_SHOWCASE_HOSPITALS: ShowcaseHospitalSeed[] = [
  {
    id: "akth", name: "Aminu Kano Teaching Hospital", shortName: "AKTH", ownership: "Federal Government", facilityLevel: "Tertiary teaching hospital", grade: 5, lga: "Kano Municipal", ward: null, latitude: null, longitude: null, description: "Federal tertiary referral and teaching hospital with multidisciplinary surgical, radiodiagnostic and research services.",
    sourceNote: "Profiled institution. Illustrative showcase capability baseline.",
    capabilities: { specialistSurgeon: 2, anaesthesia: 2, bedSpace: 1, electricity: 2, oxygen: 2, bloodBank: 2, imaging: 2, cathLab: 2, ventilators: 2, pathology: 2, theatre: 2, intensiveCare: 2, perioperativeNursing: 2, infectionControl: 2, sterileProcessing: 2, emergencyResponse: 2, pharmacy: 2, biomedicalEngineering: 2, renalSupport: 2, endoscopy: 2, interventionalRadiology: 2, patientMonitoring: 2 },
  },
  {
    id: "mmsh", name: "Murtala Muhammad Specialist Hospital", shortName: "MMSH", ownership: "Kano State Government", facilityLevel: "State specialist hospital", grade: 4, lga: "Kano Municipal", ward: "Kofar Mata", latitude: null, longitude: null, description: "High-volume state specialist hospital serving urban, emergency and referral care needs across Kano metropolis.",
    sourceNote: "Profiled institution. Illustrative showcase capability baseline.",
    capabilities: { specialistSurgeon: 2, anaesthesia: 2, bedSpace: 2, electricity: 1, oxygen: 2, bloodBank: 1, imaging: 1, cathLab: 1, ventilators: 1, pathology: 2, theatre: 2, intensiveCare: 1, perioperativeNursing: 2, infectionControl: 2, sterileProcessing: 2, emergencyResponse: 2, pharmacy: 2, biomedicalEngineering: 1, renalSupport: 1, endoscopy: 1, interventionalRadiology: 1, patientMonitoring: 2 },
  },
  {
    id: "pam", name: "Prime Alliance Multicare Specialist Hospital", shortName: "PAM", ownership: "Private", facilityLevel: "Private specialist hospital", grade: 4, lga: "Kano Municipal", ward: null, latitude: null, longitude: null, description: "Private multi-specialty facility designed around professional staffing, modern diagnostics and structured recovery support.",
    sourceNote: "Profiled institution. Illustrative showcase capability baseline.",
    capabilities: { specialistSurgeon: 1, anaesthesia: 2, bedSpace: 1, electricity: 2, oxygen: 2, bloodBank: 1, imaging: 2, cathLab: 0, ventilators: 1, pathology: 1, theatre: 2, intensiveCare: 1, perioperativeNursing: 2, infectionControl: 1, sterileProcessing: 1, emergencyResponse: 1, pharmacy: 2, biomedicalEngineering: 1, renalSupport: 1, endoscopy: 1, interventionalRadiology: 0, patientMonitoring: 1 },
  },
  {
    id: "kmc", name: "Kano Medical Centre", shortName: "KMC", ownership: "Private", facilityLevel: "Private medical centre", grade: 3, lga: "Nassarawa", ward: "Nassarawa GRA", latitude: null, longitude: null, description: "Private medical centre focused on accessible general care, routine diagnostics, maternal-child health and moderate procedures.",
    sourceNote: "Profiled institution. Illustrative showcase capability baseline.",
    capabilities: { specialistSurgeon: 1, anaesthesia: 1, bedSpace: 1, electricity: 2, oxygen: 1, bloodBank: 0, imaging: 1, cathLab: 0, ventilators: 0, pathology: 1, theatre: 1, intensiveCare: 0, perioperativeNursing: 1, infectionControl: 1, sterileProcessing: 1, emergencyResponse: 1, pharmacy: 1, biomedicalEngineering: 0, renalSupport: 0, endoscopy: 1, interventionalRadiology: 0, patientMonitoring: 1 },
  },
  {
    id: "dno", name: "Dala National Orthophedic Hospital", shortName: "DNOH", ownership: "Public", facilityLevel: "Tertiary", grade: 4, lga: "Dala", ward: "Kofar Ruwa", latitude: "12.020857", longitude: "8.502363", description: "Tertiary public orthopaedic facility record selected from the supplied Kano State health-facility directory.",
    sourceNote: "Facility name and location sourced from the Kano directory. Illustrative showcase capability baseline.",
    capabilities: { specialistSurgeon: 2, anaesthesia: 2, bedSpace: 2, electricity: 2, oxygen: 2, bloodBank: 1, imaging: 2, cathLab: 0, ventilators: 1, pathology: 1, theatre: 2, intensiveCare: 2, perioperativeNursing: 2, infectionControl: 2, sterileProcessing: 2, emergencyResponse: 2, pharmacy: 1, biomedicalEngineering: 2, renalSupport: 1, endoscopy: 0, interventionalRadiology: 0, patientMonitoring: 2 },
  },
];

export type InactiveHospitalSeed = Pick<ShowcaseHospitalSeed, "id" | "name" | "ownership" | "facilityLevel" | "lga" | "ward" | "latitude" | "longitude">;

export { INACTIVE_SHOWCASE_HOSPITALS } from "./inactiveHospitals.generated";

export const SHOWCASE_PROFILE = {
  id: "showcase-referral-profile",
  displayName: "Referral demonstration profile",
  patientReference: "DEMO-REF-024",
  conditionSummary: "Non-clinical showcase record — replace with a verified pre-registered profile before use.",
  sourceHospitalId: "kmc",
};
