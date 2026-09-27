import { config } from "dotenv";

// Existing process variables win; local development values take precedence
// over optional .env defaults.
config({ path: ".env.local" });
config();
