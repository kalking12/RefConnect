import { and, count, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import { nanoid } from "nanoid";
import { ACTIVE_SHOWCASE_HOSPITALS, INACTIVE_SHOWCASE_HOSPITALS, SHOWCASE_PROFILE } from "../shared/showcaseData";
import { calculateReadiness, type CapabilityKey, type CapabilityLevel, type CapabilityValues, SURGERY_TYPES } from "../shared/readiness";
import { validateReferralEligibility, validateReferralProcedure } from "../shared/referral";
import { hospitalCapabilities, hospitals, patientProfiles, referralHandoffs, surgeryCriteria, surgeryTypes, users } from "../drizzle/schema";
import { ADMIN_EMAIL } from "../shared/const";
import { databaseTlsOptions } from "./_core/dbTls";

let _db: MySql2Database | null = null;

export type HospitalReadinessView = {
  id: string;
  name: string;
  shortName: string | null;
  ownership: string;
  facilityLevel: string;
  grade: number | null;
  lga: string;
  ward: string | null;
  description: string | null;
  active: boolean;
  sourceNote: string | null;
  isIllustrative: boolean;
  capabilities: CapabilityValues;
  scores: Record<string, number>;
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 5,
        ssl: databaseTlsOptions(),
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export function resolveGoogleUserRole(email: string): "user" | "admin" {
  return email.trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
}

export async function upsertGoogleUser(input: { googleSub: string; name: string; email: string; pictureUrl: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Google sign-in cannot be completed.");
  const existing = (await db.select().from(users).where(eq(users.googleSub, input.googleSub)).limit(1))[0];
  const now = new Date();
  const initialRole = resolveGoogleUserRole(input.email);
  if (existing) {
    // Grants belong to the verified Google identity at its current email. A
    // legacy row or an account whose email changes must be approved again.
    const sameEmail = existing.email?.trim().toLowerCase() === input.email.trim().toLowerCase();
    const sameIdentity = existing.loginMethod === "google" && sameEmail;
    const approved = sameIdentity && existing.role === "admin" && Boolean(existing.adminApprovedAt);
    const role = initialRole === "admin" || approved ? "admin" : "user";
    await db.update(users).set({ googleSub: input.googleSub, name: input.name, email: input.email, pictureUrl: input.pictureUrl, loginMethod: "google", lastSignedIn: now,
      // A concurrent owner revoke/promotion must not be overwritten by an
      // ordinary sign-in that read an older version of the role columns.
      ...(initialRole === "admin" ? { role: "admin" as const, adminApprovedAt: null } :
        sameIdentity ? {} : { role: "user" as const, adminApprovedAt: null }),
    }).where(eq(users.id, existing.id));
    return { openId: existing.openId, name: input.name, role };
  }
  const openId = `google:${input.googleSub}`;
  await db.insert(users).values({ openId, googleSub: input.googleSub, name: input.name, email: input.email, pictureUrl: input.pictureUrl, loginMethod: "google", lastSignedIn: now, role: initialRole });
  return { openId, name: input.name, role: initialRole };
}

function isOwnerEmail(email: string | null): boolean {
  return !!email && resolveGoogleUserRole(email) === "admin";
}

function publicAccount(user: typeof users.$inferSelect) {
  const isOwner = isOwnerEmail(user.email);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    pictureUrl: user.pictureUrl,
    role: isOwner || (user.role === "admin" && Boolean(user.adminApprovedAt)) ? "admin" as const : "user" as const,
    isOwner,
    lastSignedIn: user.lastSignedIn,
  };
}

/** Only accounts created by a verified Google sign-in can be promoted. */
export async function listVerifiedGoogleUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Administrator accounts cannot be listed.");
  const rows = await db.select().from(users).where(and(
    eq(users.loginMethod, "google"), isNotNull(users.googleSub), isNotNull(users.email),
  ));
  return rows.filter((user) => user.loginMethod === "google" && Boolean(user.googleSub && user.email)).map(publicAccount);
}

export async function setGoogleUserAdmin(userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Administrator access cannot be changed.");
  const eligible = and(eq(users.id, userId), eq(users.loginMethod, "google"),
    isNotNull(users.googleSub), isNotNull(users.email));
  const target = (await db.select().from(users).where(eligible).limit(1))[0];
  if (!target?.googleSub || !target.email || target.loginMethod !== "google") return null;
  if (isOwnerEmail(target.email) && !isAdmin) return { error: "owner" as const };
  const isOwner = isOwnerEmail(target.email);
  await db.update(users).set({ role: isOwner || isAdmin ? "admin" : "user", adminApprovedAt: isOwner ? null : isAdmin ? new Date() : null }).where(and(
    eligible, eq(users.googleSub, target.googleSub), eq(users.email, target.email),
  ));
  const updated = (await db.select().from(users).where(eligible).limit(1))[0];
  if (!updated || updated.email !== target.email || updated.googleSub !== target.googleSub) return null;
  const account = publicAccount(updated);
  if ((account.role === "admin") !== isAdmin) return { error: "conflict" as const };
  return { account };
}

function scoresFor(capabilities: CapabilityValues) {
  return Object.fromEntries(SURGERY_TYPES.map((surgery) => [surgery.id, calculateReadiness(capabilities, surgery.weights)]));
}

function staticHospitalViews(): HospitalReadinessView[] {
  return [
    ...ACTIVE_SHOWCASE_HOSPITALS.map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      shortName: hospital.shortName,
      ownership: hospital.ownership,
      facilityLevel: hospital.facilityLevel,
      grade: hospital.grade,
      lga: hospital.lga,
      ward: hospital.ward,
      description: hospital.description,
      active: true,
      sourceNote: hospital.sourceNote,
      isIllustrative: true,
      capabilities: hospital.capabilities,
      scores: scoresFor(hospital.capabilities),
    })),
    ...INACTIVE_SHOWCASE_HOSPITALS.map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      shortName: null,
      ownership: hospital.ownership,
      facilityLevel: hospital.facilityLevel,
      grade: null,
      lga: hospital.lga,
      ward: hospital.ward,
      description: null,
      active: false,
      sourceNote: "Kano State facility directory record — inactive showcase listing.",
      isIllustrative: false,
      capabilities: {},
      scores: {},
    })),
  ];
}

export async function ensureShowcaseData() {
  const db = await getDb();
  if (!db) return false;
  const existing = await db.select({ total: count() }).from(hospitals);
  const hasHospitalData = (existing[0]?.total ?? 0) > 0;

  if (!hasHospitalData) {
  await db.insert(hospitals).values([
    ...ACTIVE_SHOWCASE_HOSPITALS.map((hospital) => ({
      externalId: hospital.id,
      name: hospital.name,
      shortName: hospital.shortName,
      ownership: hospital.ownership,
      facilityLevel: hospital.facilityLevel,
      grade: hospital.grade,
      lga: hospital.lga,
      ward: hospital.ward,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      description: hospital.description,
      active: true,
      sourceNote: hospital.sourceNote,
      isIllustrative: true,
    })),
    ...INACTIVE_SHOWCASE_HOSPITALS.map((hospital) => ({
      externalId: hospital.id,
      name: hospital.name,
      shortName: null,
      ownership: hospital.ownership,
      facilityLevel: hospital.facilityLevel,
      grade: null,
      lga: hospital.lga,
      ward: hospital.ward,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      description: null,
      active: false,
      sourceNote: "Kano State facility directory record — inactive showcase listing.",
      isIllustrative: false,
    })),
  ]);

  const inserted = await db.select().from(hospitals);
  const idByExternal = new Map(inserted.map((hospital) => [hospital.externalId, hospital.id]));
  const capabilityRows = ACTIVE_SHOWCASE_HOSPITALS.flatMap((hospital) => Object.entries(hospital.capabilities).map(([capabilityKey, level]) => ({
    hospitalId: idByExternal.get(hospital.id)!,
    capabilityKey,
    level,
  })));
  await db.insert(hospitalCapabilities).values(capabilityRows);
  await db.insert(patientProfiles).values({
    id: SHOWCASE_PROFILE.id,
    displayName: SHOWCASE_PROFILE.displayName,
    patientReference: SHOWCASE_PROFILE.patientReference,
    conditionSummary: SHOWCASE_PROFILE.conditionSummary,
    sourceHospitalId: idByExternal.get(SHOWCASE_PROFILE.sourceHospitalId),
    isDemonstration: true,
    active: true,
  });
  }

  await db.insert(surgeryTypes).values(SURGERY_TYPES.map((surgery) => ({
    externalId: surgery.id, name: surgery.name, shortName: surgery.shortName, specialty: surgery.specialty, description: surgery.description, active: true,
  }))).onDuplicateKeyUpdate({ set: {
    name: sql`VALUES(${surgeryTypes.name})`,
    shortName: sql`VALUES(${surgeryTypes.shortName})`,
    specialty: sql`VALUES(${surgeryTypes.specialty})`,
    description: sql`VALUES(${surgeryTypes.description})`,
    active: true,
  } });
  await db.update(surgeryTypes).set({ active: false }).where(inArray(surgeryTypes.externalId, ["cancer-surgery", "cardiac-surgery", "lung-transplant", "orthopaedic-surgery"]));
  const allHospitalRows = await db.select().from(hospitals);
  const hospitalIdByExternal = new Map(allHospitalRows.map((hospital) => [hospital.externalId, hospital.id]));
  const currentCapabilities = await db.select().from(hospitalCapabilities);
  const capabilityKeys = new Set(currentCapabilities.map((row) => `${row.hospitalId}:${row.capabilityKey}`));
  const missingCapabilities = ACTIVE_SHOWCASE_HOSPITALS.flatMap((hospital) => Object.entries(hospital.capabilities).map(([capabilityKey, level]) => ({
    hospitalId: hospitalIdByExternal.get(hospital.id)!, capabilityKey, level,
  }))).filter((row) => !capabilityKeys.has(`${row.hospitalId}:${row.capabilityKey}`));
  if (missingCapabilities.length) await db.insert(hospitalCapabilities).values(missingCapabilities);

  const insertedSurgeryTypes = await db.select().from(surgeryTypes);
  const idBySurgery = new Map(insertedSurgeryTypes.map((surgery) => [surgery.externalId, surgery.id]));
  const criteriaRows = SURGERY_TYPES.flatMap((surgery) => Object.entries(surgery.weights).map(([capabilityKey, weight]) => ({
    surgeryTypeId: idBySurgery.get(surgery.id)!, capabilityKey, weight,
  })));
  await db.insert(surgeryCriteria).values(criteriaRows).onDuplicateKeyUpdate({ set: { weight: sql`VALUES(${surgeryCriteria.weight})` } });
  return true;
}

export async function listHospitalReadiness(): Promise<HospitalReadinessView[]> {
  const db = await getDb();
  if (!db) return staticHospitalViews();
  await ensureShowcaseData();
  const hospitalRows = await db.select().from(hospitals);
  const capabilityRows = await db.select().from(hospitalCapabilities);
  const capsByHospital = new Map<number, CapabilityValues>();
  for (const row of capabilityRows) {
    const existing = capsByHospital.get(row.hospitalId) ?? {};
    existing[row.capabilityKey as CapabilityKey] = row.level as CapabilityLevel;
    capsByHospital.set(row.hospitalId, existing);
  }
  return hospitalRows.map((hospital) => {
    const capabilities = capsByHospital.get(hospital.id) ?? {};
    return {
      id: hospital.externalId,
      name: hospital.name,
      shortName: hospital.shortName,
      ownership: hospital.ownership,
      facilityLevel: hospital.facilityLevel,
      grade: hospital.grade,
      lga: hospital.lga,
      ward: hospital.ward,
      description: hospital.description,
      active: hospital.active,
      sourceNote: hospital.sourceNote,
      isIllustrative: hospital.isIllustrative,
      capabilities,
      scores: hospital.active ? scoresFor(capabilities) : {},
    };
  });
}

export async function updateHospitalCapabilities(externalId: string, capabilities: CapabilityValues) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Capability changes cannot be saved.");
  await ensureShowcaseData();
  const hospital = (await db.select().from(hospitals).where(eq(hospitals.externalId, externalId)).limit(1))[0];
  if (!hospital?.active) throw new Error("Only active showcase hospitals can be updated.");
  for (const [capabilityKey, level] of Object.entries(capabilities)) {
    await db.insert(hospitalCapabilities).values({ hospitalId: hospital.id, capabilityKey, level: level ?? 0 }).onDuplicateKeyUpdate({ set: { level: level ?? 0 } });
  }
  return listHospitalReadiness();
}

export async function updateHospitalProfile(externalId: string, input: { grade: number; facilityLevel: string; ownership: string; description: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Hospital profile changes cannot be saved.");
  await ensureShowcaseData();
  const hospital = (await db.select().from(hospitals).where(eq(hospitals.externalId, externalId)).limit(1))[0];
  if (!hospital?.active) throw new Error("Only active showcase hospitals can be updated.");
  await db.update(hospitals).set({ grade: input.grade, facilityLevel: input.facilityLevel, ownership: input.ownership, description: input.description }).where(eq(hospitals.id, hospital.id));
  return listHospitalReadiness();
}

export async function listPatientProfiles(userId: number) {
  const db = await getDb();
  if (!db) return [SHOWCASE_PROFILE];
  await ensureShowcaseData();
  const rows = await db.select().from(patientProfiles).where(and(eq(patientProfiles.active, true), or(eq(patientProfiles.isDemonstration, true), eq(patientProfiles.ownerUserId, userId))));
  return rows.map((profile) => ({
    id: profile.id,
    displayName: profile.displayName,
    patientReference: profile.patientReference,
    conditionSummary: profile.conditionSummary,
    isDemonstration: profile.isDemonstration,
  }));
}

export function buildPreparedReferralInsert(
  profile: Pick<typeof patientProfiles.$inferSelect, "id" | "sourceHospitalId">,
  destinationHospitalId: number,
  surgeryTypeId: string,
) {
  return {
    id: nanoid(),
    profileId: profile.id,
    sourceHospitalId: profile.sourceHospitalId,
    destinationHospitalId,
    surgeryTypeId,
    // A legacy NOT NULL column remains for existing records. Prepared
    // handoffs have no delivery endpoint, so copying patient details here
    // would create an unnecessary second store of sensitive information.
    profileSnapshot: "{}",
    status: "prepared" as const,
  };
}

export async function createReferral(profileId: string, destinationExternalId: string, surgeryTypeId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable. Referral handoff could not be prepared.");
  await ensureShowcaseData();
  const profile = (await db.select().from(patientProfiles).where(and(eq(patientProfiles.id, profileId), eq(patientProfiles.active, true), or(eq(patientProfiles.isDemonstration, true), eq(patientProfiles.ownerUserId, userId)))).limit(1))[0];
  const destination = (await db.select().from(hospitals).where(eq(hospitals.externalId, destinationExternalId)).limit(1))[0];
  const procedure = (await db.select().from(surgeryTypes).where(eq(surgeryTypes.externalId, surgeryTypeId)).limit(1))[0];
  validateReferralEligibility(profile, destination);
  validateReferralProcedure(procedure && { id: procedure.externalId, active: procedure.active });
  const handoff = buildPreparedReferralInsert(profile, destination.id, surgeryTypeId);
  await db.insert(referralHandoffs).values(handoff);
  return { id: handoff.id, status: handoff.status };
}
