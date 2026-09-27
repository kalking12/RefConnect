export function databaseTlsOptions() {
  const ca = process.env.DB_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (!ca) return undefined;

  if (!ca.includes("-----BEGIN CERTIFICATE-----") ||
      !ca.includes("-----END CERTIFICATE-----")) {
    throw new Error("DB_CA_CERT must contain the Aiven CA certificate in PEM format");
  }

  return { ca, rejectUnauthorized: true };
}
