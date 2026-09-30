import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

config({ path: ".env.local" });
config();

function databaseTlsOptions() {
  const ca = process.env.DB_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (!ca) return undefined;
  if (!ca.includes("-----BEGIN CERTIFICATE-----") || !ca.includes("-----END CERTIFICATE-----")) {
    throw new Error("DB_CA_CERT must contain the Aiven CA certificate in PEM format");
  }
  return { ca, rejectUnauthorized: true };
}

const HISTORY_TABLE = "__drizzle_migrations";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required to run migrations");
  process.exit(1);
}

const pool = createPool({
  uri: connectionString,
  connectionLimit: 1,
  ssl: databaseTlsOptions(),
});

// Drizzle decides which migrations to skip purely from rows in its history
// table, and never checks that the tables those migrations created still
// exist. A database that was imported or restored can therefore claim
// "already applied" while tables are missing, and every later migration then
// fails with "table doesn't exist".
//
// This repairs that, and only ever ADDS what is missing:
//  - No application tables at all + history rows: clear the history so the
//    whole schema is created from scratch (nothing exists to lose).
//  - Some application tables exist: re-create just the missing tables (and
//    re-add missing simple columns) using the original migration SQL, leaving
//    every existing table and row untouched.
async function repairDatabase() {
  const [tableRows] = await pool.query("SHOW TABLES");
  const tables = tableRows.map((row) => Object.values(row)[0]);
  console.log("Existing tables:", tables.length ? tables.join(", ") : "(none)");

  if (!tables.includes(HISTORY_TABLE)) return;

  const [history] = await pool.query(`SELECT id, created_at FROM \`${HISTORY_TABLE}\` ORDER BY created_at`);
  console.log(`Recorded migrations: ${history.length}`);
  if (history.length === 0) return;

  const appTables = tables.filter((name) => name !== HISTORY_TABLE);
  if (appTables.length === 0) {
    console.warn("Migration history exists but no application tables do. Resetting history so the schema is created from scratch.");
    await pool.query(`DROP TABLE \`${HISTORY_TABLE}\``);
    return;
  }

  // SQL statements of every migration the history says is already applied.
  const journal = JSON.parse(readFileSync("./drizzle/meta/_journal.json", "utf8"));
  const recorded = new Set(history.map((row) => Number(row.created_at)));
  const statements = [];
  for (const entry of journal.entries) {
    if (!recorded.has(Number(entry.when))) continue;
    const sql = readFileSync(`./drizzle/${entry.tag}.sql`, "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) statements.push(trimmed);
    }
  }

  const present = new Set(tables);
  const targetsTable = (statement, table) =>
    new RegExp(`^(CREATE TABLE|ALTER TABLE) \`${table}\``, "i").test(statement) ||
    new RegExp(`^CREATE (UNIQUE )?INDEX .* ON \`${table}\``, "i").test(statement);

  // 1. Tables that were recorded as created but are missing.
  const createdByHistory = statements
    .map((statement) => /^CREATE TABLE `(\w+)`/i.exec(statement)?.[1])
    .filter(Boolean);
  for (const table of createdByHistory) {
    if (present.has(table)) continue;
    console.warn(`Table \`${table}\` is recorded as created but is missing. Re-creating it (existing tables are not touched).`);
    for (const statement of statements.filter((s) => targetsTable(s, table))) {
      console.log("  running:", statement.split("\n")[0].slice(0, 100));
      await pool.query(statement);
    }
    present.add(table);
  }

  // 2. Simple columns that were recorded as added but are missing.
  for (const statement of statements) {
    const match = /^ALTER TABLE `(\w+)` ADD `(\w+)` /i.exec(statement);
    if (!match) continue;
    const [, table, column] = match;
    if (!present.has(table)) continue;
    const [found] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (found.length === 0) {
      console.warn(`Column \`${table}\`.\`${column}\` is recorded as added but is missing. Adding it.`);
      await pool.query(statement);
    }
  }
}

try {
  await repairDatabase();
  console.log("Applying migrations...");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
  process.exit(0);
} catch (error) {
  console.error("Migration failed:");
  console.error(error);
  process.exit(1);
}
