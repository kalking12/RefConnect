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
// table. If that table says "already applied" but the real tables are gone
// (e.g. the database was restored or recreated), every later migration fails
// with "table doesn't exist". That state is safe to repair: with no
// application tables present, there is no data to lose, so we clear the
// history and let the schema be created from scratch. If ANY application
// table exists we never touch anything and just report what we found.
async function repairStaleHistory() {
  const [tableRows] = await pool.query("SHOW TABLES");
  const tables = tableRows.map((row) => Object.values(row)[0]);
  console.log("Existing tables:", tables.length ? tables.join(", ") : "(none)");

  if (!tables.includes(HISTORY_TABLE)) return;

  const [history] = await pool.query(`SELECT id, created_at FROM \`${HISTORY_TABLE}\` ORDER BY created_at`);
  console.log(`Recorded migrations: ${history.length}`, history.length ? JSON.stringify(history) : "");

  const appTables = tables.filter((name) => name !== HISTORY_TABLE);
  if (history.length > 0 && appTables.length === 0) {
    console.warn("Migration history exists but no application tables do. Resetting history so the schema is created from scratch.");
    await pool.query(`DROP TABLE \`${HISTORY_TABLE}\``);
  }
}

try {
  await repairStaleHistory();
  console.log("Applying migrations...");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
  process.exit(0);
} catch (error) {
  console.error("Migration failed:");
  console.error(error);
  process.exit(1);
}
