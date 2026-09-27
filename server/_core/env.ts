export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  appOrigin: process.env.APP_ORIGIN ?? "",
  sheetWebhookUrl: process.env.GOOGLE_SHEET_WEBHOOK_URL ?? "",
  sheetWebhookSecret: process.env.GOOGLE_SHEET_WEBHOOK_SECRET ?? "",
};
