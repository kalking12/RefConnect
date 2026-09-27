import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  googleSub: varchar("googleSub", { length: 128 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  pictureUrl: varchar("pictureUrl", { length: 2048 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Existing admin rows from Manus do not become active merely because the
  // owner enables role management. Only an owner-issued grant sets this value.
  adminApprovedAt: timestamp("adminApprovedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const hospitals = mysqlTable("hospitals", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 32 }),
  ownership: varchar("ownership", { length: 128 }).notNull(),
  facilityLevel: varchar("facilityLevel", { length: 128 }).notNull(),
  grade: int("grade"),
  lga: varchar("lga", { length: 96 }).notNull(),
  ward: varchar("ward", { length: 128 }),
  latitude: varchar("latitude", { length: 48 }),
  longitude: varchar("longitude", { length: 48 }),
  description: text("description"),
  active: boolean("active").default(false).notNull(),
  sourceNote: text("sourceNote"),
  isIllustrative: boolean("isIllustrative").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  activeIndex: index("hospitals_active_idx").on(table.active),
}));

export const hospitalCapabilities = mysqlTable("hospitalCapabilities", {
  id: int("id").autoincrement().primaryKey(),
  hospitalId: int("hospitalId").notNull().references(() => hospitals.id, { onDelete: "cascade" }),
  capabilityKey: varchar("capabilityKey", { length: 64 }).notNull(),
  level: int("level").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueHospitalCapability: uniqueIndex("hospital_capability_unique").on(table.hospitalId, table.capabilityKey),
}));

export const surgeryTypes = mysqlTable("surgeryTypes", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  shortName: varchar("shortName", { length: 96 }).notNull(),
  specialty: varchar("specialty", { length: 96 }).notNull().default("Unspecified"),
  description: text("description").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const surgeryCriteria = mysqlTable("surgeryCriteria", {
  id: int("id").autoincrement().primaryKey(),
  surgeryTypeId: int("surgeryTypeId").notNull().references(() => surgeryTypes.id, { onDelete: "cascade" }),
  capabilityKey: varchar("capabilityKey", { length: 64 }).notNull(),
  weight: int("weight").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueSurgeryCriterion: uniqueIndex("surgery_criterion_unique").on(table.surgeryTypeId, table.capabilityKey),
}));

export const patientProfiles = mysqlTable("patientProfiles", {
  id: varchar("id", { length: 96 }).primaryKey(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  patientReference: varchar("patientReference", { length: 96 }).notNull().unique(),
  conditionSummary: text("conditionSummary").notNull(),
  ownerUserId: int("ownerUserId").references(() => users.id, { onDelete: "set null" }),
  sourceHospitalId: int("sourceHospitalId").references(() => hospitals.id, { onDelete: "set null" }),
  isDemonstration: boolean("isDemonstration").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  ownerIndex: index("patientProfiles_ownerUserId_idx").on(table.ownerUserId),
}));

export const referralHandoffs = mysqlTable("referralHandoffs", {
  id: varchar("id", { length: 96 }).primaryKey(),
  profileId: varchar("profileId", { length: 96 }).notNull().references(() => patientProfiles.id, { onDelete: "restrict" }),
  sourceHospitalId: int("sourceHospitalId").references(() => hospitals.id, { onDelete: "set null" }),
  destinationHospitalId: int("destinationHospitalId").notNull().references(() => hospitals.id, { onDelete: "restrict" }),
  surgeryTypeId: varchar("surgeryTypeId", { length: 96 }).notNull(),
  profileSnapshot: text("profileSnapshot").notNull(),
  status: mysqlEnum("referralStatus", ["prepared", "sent", "accepted"]).default("prepared").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  destinationIndex: index("referral_destination_idx").on(table.destinationHospitalId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
