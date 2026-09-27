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

const db = drizzle(pool);

try {
  console.log("Applying migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
  process.exit(0);
} catch (error) {
  console.error("Migration failed:");
  console.error(error);
  process.exit(1);
}