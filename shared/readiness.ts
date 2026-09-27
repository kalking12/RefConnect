export const CAPABILITY_DEFINITIONS = [
  { key: "specialistSurgeon", label: "Specialist surgeons", group: "Clinical team" },
  { key: "anaesthesia", label: "Anaesthesia team", group: "Clinical team" },
  { key: "bedSpace", label: "ICU and ward bed capacity", group: "Critical infrastructure" },
  { key: "electricity", label: "Reliable electricity", group: "Critical infrastructure" },
  { key: "oxygen", label: "Oxygen supply", group: "Critical infrastructure" },
  { key: "bloodBank", label: "Blood bank and medicines", group: "Diagnostics and support" },
  { key: "imaging", label: "CT or MRI imaging", group: "Diagnostics and support" },
  { key: "cathLab", label: "Cath lab and cardiac equipment", group: "Specialist equipment" },
  { key: "ventilators", label: "Ventilators and advanced respiratory support", group: "Specialist equipment" },
  { key: "pathology", label: "Laboratory and pathology", group: "Diagnostics and support" },
  { key: "theatre", label: "Operating theatre availability", group: "Critical infrastructure" },
  { key: "intensiveCare", label: "Dedicated intensive-care service", group: "Critical infrastructure" },
  { key: "perioperativeNursing", label: "Perioperative nursing coverage", group: "Clinical team" },
  { key: "infectionControl", label: "Infection prevention and control", group: "Clinical governance" },
  { key: "sterileProcessing", label: "Sterile processing and instrument sets", group: "Critical infrastructure" },
  { key: "emergencyResponse", label: "Emergency response and resuscitation", group: "Clinical team" },
  { key: "pharmacy", label: "Essential surgical pharmacy stock", group: "Diagnostics and support" },
  { key: "biomedicalEngineering", label: "Biomedical engineering support", group: "Diagnostics and support" },
  { key: "renalSupport", label: "Renal support and dialysis access", group: "Specialist equipment" },
  { key: "endoscopy", label: "Endoscopy and minimally invasive support", group: "Specialist equipment" },
  { key: "interventionalRadiology", label: "Interventional radiology access", group: "Specialist equipment" },
  { key: "patientMonitoring", label: "Continuous patient monitoring", group: "Critical infrastructure" },
] as const;

export type CapabilityKey = (typeof CAPABILITY_DEFINITIONS)[number]["key"];
export type CapabilityLevel = 0 | 1 | 2;
export type CapabilityValues = Partial<Record<CapabilityKey, CapabilityLevel>>;
export type ProcedureSpecialty = "Cardiac & Vascular" | "Oncology" | "Neurosurgery" | "Orthopaedic & Trauma" | "General & Abdominal Surgery" | "Urology & Renal" | "Obstetrics/Gynecology & ENT";

type WeightProfile = Record<CapabilityKey, number>;
type WeightOverrides = Partial<WeightProfile>;

const WEIGHT_TEMPLATES: Record<string, WeightProfile> = {
  cardiac: { specialistSurgeon: 14, anaesthesia: 11, bedSpace: 10, electricity: 10, oxygen: 7, bloodBank: 8, imaging: 5, cathLab: 11, ventilators: 7, pathology: 3, theatre: 4, intensiveCare: 5, perioperativeNursing: 4, infectionControl: 2, sterileProcessing: 2, emergencyResponse: 5, pharmacy: 2, biomedicalEngineering: 4, renalSupport: 3, endoscopy: 0, interventionalRadiology: 5, patientMonitoring: 6 },
  oncology: { specialistSurgeon: 14, anaesthesia: 8, bedSpace: 7, electricity: 8, oxygen: 5, bloodBank: 7, imaging: 8, cathLab: 0, ventilators: 2, pathology: 9, theatre: 6, intensiveCare: 3, perioperativeNursing: 4, infectionControl: 3, sterileProcessing: 3, emergencyResponse: 2, pharmacy: 3, biomedicalEngineering: 2, renalSupport: 2, endoscopy: 3, interventionalRadiology: 3, patientMonitoring: 2 },
  neuro: { specialistSurgeon: 16, anaesthesia: 10, bedSpace: 9, electricity: 10, oxygen: 6, bloodBank: 8, imaging: 10, cathLab: 0, ventilators: 4, pathology: 4, theatre: 8, intensiveCare: 7, perioperativeNursing: 5, infectionControl: 3, sterileProcessing: 4, emergencyResponse: 5, pharmacy: 2, biomedicalEngineering: 3, renalSupport: 2, endoscopy: 0, interventionalRadiology: 2, patientMonitoring: 4 },
  orthopaedic: { specialistSurgeon: 13, anaesthesia: 8, bedSpace: 9, electricity: 8, oxygen: 5, bloodBank: 7, imaging: 9, cathLab: 0, ventilators: 2, pathology: 3, theatre: 8, intensiveCare: 4, perioperativeNursing: 6, infectionControl: 3, sterileProcessing: 6, emergencyResponse: 5, pharmacy: 5, biomedicalEngineering: 4, renalSupport: 2, endoscopy: 2, interventionalRadiology: 1, patientMonitoring: 3 },
  general: { specialistSurgeon: 11, anaesthesia: 8, bedSpace: 6, electricity: 8, oxygen: 5, bloodBank: 5, imaging: 6, cathLab: 0, ventilators: 2, pathology: 4, theatre: 8, intensiveCare: 3, perioperativeNursing: 5, infectionControl: 3, sterileProcessing: 5, emergencyResponse: 4, pharmacy: 5, biomedicalEngineering: 3, renalSupport: 1, endoscopy: 5, interventionalRadiology: 2, patientMonitoring: 3 },
  urology: { specialistSurgeon: 12, anaesthesia: 7, bedSpace: 6, electricity: 8, oxygen: 4, bloodBank: 5, imaging: 8, cathLab: 0, ventilators: 2, pathology: 5, theatre: 7, intensiveCare: 3, perioperativeNursing: 4, infectionControl: 2, sterileProcessing: 5, emergencyResponse: 3, pharmacy: 4, biomedicalEngineering: 3, renalSupport: 8, endoscopy: 6, interventionalRadiology: 4, patientMonitoring: 2 },
  obstetrics: { specialistSurgeon: 12, anaesthesia: 8, bedSpace: 9, electricity: 9, oxygen: 6, bloodBank: 8, imaging: 6, cathLab: 0, ventilators: 3, pathology: 4, theatre: 7, intensiveCare: 4, perioperativeNursing: 6, infectionControl: 4, sterileProcessing: 5, emergencyResponse: 6, pharmacy: 5, biomedicalEngineering: 2, renalSupport: 2, endoscopy: 2, interventionalRadiology: 1, patientMonitoring: 3 },
  ent: { specialistSurgeon: 11, anaesthesia: 6, bedSpace: 5, electricity: 7, oxygen: 5, bloodBank: 3, imaging: 4, cathLab: 0, ventilators: 4, pathology: 3, theatre: 7, intensiveCare: 2, perioperativeNursing: 5, infectionControl: 4, sterileProcessing: 4, emergencyResponse: 5, pharmacy: 4, biomedicalEngineering: 2, renalSupport: 1, endoscopy: 7, interventionalRadiology: 1, patientMonitoring: 2 },
};

type ProcedureSeed = { id: string; name: string; shortName: string; description: string; specialty: ProcedureSpecialty; weightProfile: keyof typeof WEIGHT_TEMPLATES; overrides: WeightOverrides };

const procedureSeeds: readonly ProcedureSeed[] = [
  { id: "cabg", name: "Coronary Artery Bypass Grafting (CABG)", shortName: "CABG", description: "Surgical coronary revascularisation.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { cathLab: 15, intensiveCare: 9, bloodBank: 10 } },
  { id: "aortic-valve-replacement", name: "Aortic Valve Replacement", shortName: "Aortic valve", description: "Open surgical aortic valve replacement.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { cathLab: 12, bloodBank: 11, ventilators: 9 } },
  { id: "mitral-valve-replacement", name: "Mitral Valve Replacement", shortName: "Mitral valve", description: "Open surgical mitral valve replacement.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { cathLab: 13, intensiveCare: 8, patientMonitoring: 9 } },
  { id: "percutaneous-coronary-angioplasty", name: "Percutaneous Coronary Angioplasty", shortName: "Coronary angioplasty", description: "Catheter-based coronary intervention.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { cathLab: 18, interventionalRadiology: 10, theatre: 1 } },
  { id: "pacemaker-insertion", name: "Pacemaker Insertion", shortName: "Pacemaker", description: "Cardiac rhythm-device implantation.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { cathLab: 16, biomedicalEngineering: 10, intensiveCare: 2 } },
  { id: "carotid-endarterectomy", name: "Carotid Endarterectomy", shortName: "Carotid surgery", description: "Open carotid artery plaque removal.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { imaging: 11, bloodBank: 10, patientMonitoring: 8 } },
  { id: "cardiac-ablation", name: "Cardiac Ablation", shortName: "Cardiac ablation", description: "Electrophysiology-guided cardiac ablation.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { cathLab: 17, biomedicalEngineering: 9, interventionalRadiology: 8 } },
  { id: "aneurysm-open-repair", name: "Aneurysm Surgery (Open Repair)", shortName: "Aneurysm repair", description: "Open vascular aneurysm repair.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { bloodBank: 14, intensiveCare: 10, emergencyResponse: 8 } },
  { id: "peripheral-angioplasty", name: "Peripheral Angioplasty", shortName: "Peripheral angioplasty", description: "Catheter-based peripheral vascular intervention.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { interventionalRadiology: 14, cathLab: 14, theatre: 0 } },
  { id: "thrombectomy", name: "Thrombectomy", shortName: "Thrombectomy", description: "Surgical or catheter-based clot removal.", specialty: "Cardiac & Vascular", weightProfile: "cardiac", overrides: { emergencyResponse: 12, interventionalRadiology: 12, imaging: 9 } },
  { id: "radical-mastectomy", name: "Radical Mastectomy", shortName: "Radical mastectomy", description: "Extensive breast cancer resection.", specialty: "Oncology", weightProfile: "oncology", overrides: { pathology: 12, theatre: 9, specialistSurgeon: 16 } },
  { id: "lumpectomy", name: "Lumpectomy", shortName: "Lumpectomy", description: "Breast-conserving cancer surgery.", specialty: "Oncology", weightProfile: "oncology", overrides: { pathology: 13, imaging: 11, intensiveCare: 1 } },
  { id: "ovarian-cancer-surgery", name: "Ovarian Cancer Surgery", shortName: "Ovarian cancer", description: "Complex gynaecological oncology resection.", specialty: "Oncology", weightProfile: "oncology", overrides: { bloodBank: 10, imaging: 10, intensiveCare: 6 } },
  { id: "endometrial-cancer-surgery", name: "Endometrial Cancer Surgery", shortName: "Endometrial cancer", description: "Uterine cancer surgical treatment.", specialty: "Oncology", weightProfile: "oncology", overrides: { pathology: 13, imaging: 10, endoscopy: 7 } },
  { id: "hepatectomy", name: "Hepatectomy (Liver Resection)", shortName: "Hepatectomy", description: "Major liver resection.", specialty: "Oncology", weightProfile: "oncology", overrides: { bloodBank: 15, intensiveCare: 8, emergencyResponse: 6 } },
  { id: "pancreatectomy", name: "Pancreatectomy", shortName: "Pancreatectomy", description: "Pancreatic resection.", specialty: "Oncology", weightProfile: "oncology", overrides: { intensiveCare: 9, bloodBank: 12, pathology: 12 } },
  { id: "whipple-procedure", name: "Whipple Procedure", shortName: "Whipple", description: "Pancreaticoduodenectomy.", specialty: "Oncology", weightProfile: "oncology", overrides: { specialistSurgeon: 18, intensiveCare: 10, bloodBank: 12 } },
  { id: "esophagectomy", name: "Esophagectomy", shortName: "Esophagectomy", description: "Oesophageal resection.", specialty: "Oncology", weightProfile: "oncology", overrides: { ventilators: 9, intensiveCare: 9, imaging: 10 } },
  { id: "splenectomy", name: "Splenectomy", shortName: "Splenectomy", description: "Spleen removal.", specialty: "Oncology", weightProfile: "oncology", overrides: { bloodBank: 12, emergencyResponse: 7, theatre: 9 } },
  { id: "thyroidectomy", name: "Thyroidectomy", shortName: "Thyroidectomy", description: "Thyroid gland resection.", specialty: "Oncology", weightProfile: "oncology", overrides: { pathology: 14, emergencyResponse: 7, ventilators: 6 } },
  { id: "brain-tumor-surgery", name: "Brain Tumor Surgery", shortName: "Brain tumour", description: "Intracranial tumour resection.", specialty: "Neurosurgery", weightProfile: "neuro", overrides: { imaging: 15, intensiveCare: 11, specialistSurgeon: 19 } },
  { id: "decompressive-craniectomy", name: "Decompressive Craniectomy", shortName: "Craniectomy", description: "Emergency decompression for raised intracranial pressure.", specialty: "Neurosurgery", weightProfile: "neuro", overrides: { emergencyResponse: 12, intensiveCare: 11, bloodBank: 10 } },
  { id: "spinal-fusion-surgery", name: "Spinal Fusion Surgery", shortName: "Spinal fusion", description: "Stabilising spinal fusion procedure.", specialty: "Neurosurgery", weightProfile: "neuro", overrides: { imaging: 13, sterileProcessing: 8, biomedicalEngineering: 6 } },
  { id: "laminectomy", name: "Laminectomy", shortName: "Laminectomy", description: "Spinal decompression procedure.", specialty: "Neurosurgery", weightProfile: "neuro", overrides: { imaging: 12, theatre: 10, intensiveCare: 4 } },
  { id: "vp-shunt-surgery", name: "VP Shunt Surgery", shortName: "VP shunt", description: "Ventriculoperitoneal shunt placement.", specialty: "Neurosurgery", weightProfile: "neuro", overrides: { infectionControl: 8, sterileProcessing: 8, pathology: 2 } },
  { id: "microvascular-decompression", name: "Microvascular Decompression", shortName: "Microvascular decompression", description: "Microsurgical cranial nerve decompression.", specialty: "Neurosurgery", weightProfile: "neuro", overrides: { specialistSurgeon: 20, imaging: 14, theatre: 10 } },
  { id: "traumatic-head-injury-surgery", name: "Traumatic Head Injury Surgery", shortName: "Head injury surgery", description: "Emergency operative management of traumatic head injury.", specialty: "Neurosurgery", weightProfile: "neuro", overrides: { emergencyResponse: 14, bloodBank: 12, patientMonitoring: 8 } },
  { id: "hip-replacement", name: "Hip Replacement", shortName: "Hip replacement", description: "Total hip arthroplasty.", specialty: "Orthopaedic & Trauma", weightProfile: "orthopaedic", overrides: { sterileProcessing: 10, biomedicalEngineering: 7, perioperativeNursing: 8 } },
  { id: "knee-replacement", name: "Knee Replacement", shortName: "Knee replacement", description: "Total knee arthroplasty.", specialty: "Orthopaedic & Trauma", weightProfile: "orthopaedic", overrides: { sterileProcessing: 11, pharmacy: 7, perioperativeNursing: 8 } },
  { id: "femur-fracture-fixation", name: "Femur Fracture Fixation", shortName: "Femur fixation", description: "Operative fixation of femoral fracture.", specialty: "Orthopaedic & Trauma", weightProfile: "orthopaedic", overrides: { bloodBank: 11, emergencyResponse: 9, imaging: 12 } },
  { id: "pelvis-fracture-surgery", name: "Pelvis Fracture Surgery", shortName: "Pelvis fracture", description: "Complex pelvic trauma surgery.", specialty: "Orthopaedic & Trauma", weightProfile: "orthopaedic", overrides: { bloodBank: 14, intensiveCare: 8, emergencyResponse: 10 } },
  { id: "above-knee-amputation", name: "Above-Knee Amputation", shortName: "Above-knee amputation", description: "Major lower-limb amputation.", specialty: "Orthopaedic & Trauma", weightProfile: "orthopaedic", overrides: { emergencyResponse: 10, bloodBank: 9, infectionControl: 7 } },
  { id: "external-fixator-surgery", name: "External Fixator Surgery", shortName: "External fixator", description: "External fixation for fracture stabilisation.", specialty: "Orthopaedic & Trauma", weightProfile: "orthopaedic", overrides: { biomedicalEngineering: 9, imaging: 12, emergencyResponse: 8 } },
  { id: "arthroscopic-joint-surgery", name: "Arthroscopic Joint Surgery", shortName: "Arthroscopy", description: "Minimally invasive joint surgery.", specialty: "Orthopaedic & Trauma", weightProfile: "orthopaedic", overrides: { endoscopy: 9, biomedicalEngineering: 8, intensiveCare: 1 } },
  { id: "spinal-fracture-treatment", name: "Spinal Fracture Treatment", shortName: "Spinal fracture", description: "Operative treatment of spinal fracture.", specialty: "Orthopaedic & Trauma", weightProfile: "orthopaedic", overrides: { imaging: 14, intensiveCare: 7, patientMonitoring: 6 } },
  { id: "cholecystectomy", name: "Cholecystectomy (Gallbladder Removal)", shortName: "Cholecystectomy", description: "Gallbladder removal surgery.", specialty: "General & Abdominal Surgery", weightProfile: "general", overrides: { endoscopy: 10, imaging: 9, intensiveCare: 1 } },
  { id: "appendectomy", name: "Appendectomy (Acute Appendicitis Surgery)", shortName: "Appendectomy", description: "Emergency appendix removal.", specialty: "General & Abdominal Surgery", weightProfile: "general", overrides: { emergencyResponse: 8, imaging: 8, pathology: 6 } },
  { id: "inguinal-hernia-repair", name: "Hernia Repair (Inguinal Hernia Surgery)", shortName: "Inguinal hernia", description: "Inguinal hernia repair.", specialty: "General & Abdominal Surgery", weightProfile: "general", overrides: { theatre: 10, anaesthesia: 9, intensiveCare: 0 } },
  { id: "colectomy", name: "Colectomy", shortName: "Colectomy", description: "Colon resection.", specialty: "General & Abdominal Surgery", weightProfile: "general", overrides: { pathology: 10, intensiveCare: 7, bloodBank: 9 } },
  { id: "small-bowel-resection", name: "Small Bowel Resection", shortName: "Small bowel resection", description: "Small intestinal resection.", specialty: "General & Abdominal Surgery", weightProfile: "general", overrides: { bloodBank: 8, pathology: 9, emergencyResponse: 7 } },
  { id: "laparotomy", name: "Laparotomy", shortName: "Laparotomy", description: "Open abdominal exploratory surgery.", specialty: "General & Abdominal Surgery", weightProfile: "general", overrides: { emergencyResponse: 10, bloodBank: 9, intensiveCare: 6 } },
  { id: "nephrectomy", name: "Nephrectomy", shortName: "Nephrectomy", description: "Kidney removal surgery.", specialty: "Urology & Renal", weightProfile: "urology", overrides: { renalSupport: 12, bloodBank: 8, imaging: 10 } },
  { id: "kidney-transplant", name: "Kidney Transplant", shortName: "Kidney transplant", description: "Renal transplant readiness pathway.", specialty: "Urology & Renal", weightProfile: "urology", overrides: { renalSupport: 18, infectionControl: 7, intensiveCare: 7 } },
  { id: "pcnl", name: "PCNL (Kidney Stone Removal)", shortName: "PCNL", description: "Percutaneous nephrolithotomy.", specialty: "Urology & Renal", weightProfile: "urology", overrides: { imaging: 13, interventionalRadiology: 9, endoscopy: 10 } },
  { id: "prostatectomy", name: "Prostatectomy", shortName: "Prostatectomy", description: "Surgical prostate removal.", specialty: "Urology & Renal", weightProfile: "urology", overrides: { pathology: 10, bloodBank: 7, endoscopy: 8 } },
  { id: "turp", name: "TURP Surgery", shortName: "TURP", description: "Transurethral prostate resection.", specialty: "Urology & Renal", weightProfile: "urology", overrides: { endoscopy: 14, biomedicalEngineering: 7, intensiveCare: 1 } },
  { id: "caesarean-section", name: "Caesarean Section", shortName: "Caesarean section", description: "Operative childbirth.", specialty: "Obstetrics/Gynecology & ENT", weightProfile: "obstetrics", overrides: { emergencyResponse: 12, bloodBank: 11, perioperativeNursing: 9 } },
  { id: "hysterectomy", name: "Hysterectomy", shortName: "Hysterectomy", description: "Surgical uterine removal.", specialty: "Obstetrics/Gynecology & ENT", weightProfile: "obstetrics", overrides: { bloodBank: 10, pathology: 8, theatre: 9 } },
  { id: "tonsillectomy", name: "Tonsillectomy", shortName: "Tonsillectomy", description: "Tonsil removal surgery.", specialty: "Obstetrics/Gynecology & ENT", weightProfile: "ent", overrides: { emergencyResponse: 8, ventilators: 6, intensiveCare: 1 } },
  { id: "tracheostomy", name: "Tracheostomy", shortName: "Tracheostomy", description: "Surgical airway creation.", specialty: "Obstetrics/Gynecology & ENT", weightProfile: "ent", overrides: { oxygen: 9, ventilators: 10, emergencyResponse: 11 } },
];

function normalizedWeights(template: WeightProfile, overrides: WeightOverrides): WeightProfile {
  const raw = { ...template, ...overrides };
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0);
  const normalised = Object.fromEntries(CAPABILITY_DEFINITIONS.map(({ key }) => [key, Math.round((raw[key] / total) * 100)])) as WeightProfile;
  const difference = 100 - Object.values(normalised).reduce((sum, value) => sum + value, 0);
  normalised.specialistSurgeon += difference;
  return normalised;
}

export const SURGERY_TYPES = procedureSeeds.map((procedure) => ({ ...procedure, weights: normalizedWeights(WEIGHT_TEMPLATES[procedure.weightProfile], procedure.overrides) }));
export type SurgeryType = (typeof SURGERY_TYPES)[number];
export const PROCEDURE_SPECIALTIES = Array.from(new Set(SURGERY_TYPES.map((procedure) => procedure.specialty))) as ProcedureSpecialty[];

export function calculateReadiness(values: CapabilityValues, weights: Record<string, number>) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const earned = Object.entries(weights).reduce((sum, [key, weight]) => sum + ((values[key as CapabilityKey] ?? 0) / 2) * weight, 0);
  return totalWeight ? Math.round((earned / totalWeight) * 100) : 0;
}

export function readinessTier(score: number) {
  if (score >= 80) return { label: "Ready", tone: "ready" as const };
  if (score >= 50) return { label: "Conditional", tone: "conditional" as const };
  return { label: "Not equipped", tone: "not-ready" as const };
}

export function capabilityLabel(level: number) {
  if (level === 2) return "Available";
  if (level === 1) return "Limited";
  return "Unavailable";
}
