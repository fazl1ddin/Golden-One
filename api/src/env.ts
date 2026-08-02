// Loads a local .env file into process.env using Node 22's built-in loader —
// no dotenv dependency.
//
// The file is found by walking up from this module, so the same code works when
// running from src/ under tsx and from dist/src/ after a build. Real
// deployments inject variables directly and simply have no .env to find; that
// is not an error.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

function findEnvFile(): string | null {
  const explicit = process.env.ENV_FILE;
  if (explicit) return existsSync(explicit) ? resolve(explicit) : null;

  // A NODE_ENV-specific file wins, so `.env.test` beats `.env` during tests.
  const names = process.env.NODE_ENV
    ? [`.env.${process.env.NODE_ENV}`, ".env"]
    : [".env"];

  const candidates: string[] = [];
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth += 1) {
    for (const name of names) candidates.push(join(dir, name));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const name of names) candidates.push(resolve(process.cwd(), name));

  return candidates.find((p) => existsSync(p)) ?? null;
}

const envPath = findEnvFile();
if (envPath) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // A malformed or unreadable file must not stop a deployment whose
    // configuration already lives in the real environment.
  }
}
