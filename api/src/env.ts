// Loads the local .env file (if present) into process.env.
// Node 22's built-in loader — no dotenv dependency needed.
// Imported for side effects before anything reads process.env.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// src/ -> project root
const envPath = resolve(here, "..", ".env");

if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Non-fatal: real environments may inject vars directly.
  }
}
