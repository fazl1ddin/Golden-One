// Environment configuration, validated once at boot.
//
// The point of validating here is that a misconfigured deployment fails loudly
// at startup instead of at 2am when an operator presses "lock". Anything that
// would be unsafe in production (a default JWT secret, a wildcard CORS origin,
// a selected-but-unconfigured MDM provider) is a hard startup error.

import "./env.js";
import { z } from "zod";

const bool = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.enum(["true", "false", "1", "0"]))
  .transform((v) => v === "true" || v === "1");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().min(1).default("0.0.0.0"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    /// Signing key for access tokens. Must be long enough that brute-forcing a
    /// forged operator token is not feasible.
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("12h"),

    /// Comma-separated list of allowed browser origins. "*" is refused in
    /// production: the dashboard sends a bearer token, and a wildcard origin
    /// would let any site drive the API on an operator's behalf.
    CORS_ORIGINS: z.string().default("http://localhost:5173"),

    MDM_PROVIDER: z.enum(["mock", "mosyle"]).default("mock"),
    MOSYLE_API_URL: z.string().url().optional(),
    MOSYLE_ACCESS_TOKEN: z.string().min(1).optional(),
    /// Mosyle needs an administrator login as well as the API key: since
    /// February 2024 the Authorization header must carry a JWT, which is
    /// obtained by logging in — the API key alone is not accepted.
    MOSYLE_EMAIL: z.string().email().optional(),
    MOSYLE_PASSWORD: z.string().min(1).optional(),

    /// How often the reconciler asks the MDM what actually happened to
    /// commands that are still pending. 0 disables the background loop.
    RECONCILE_INTERVAL_MS: z.coerce.number().int().min(0).default(60_000),
    /// Give up on a command that the device never picked up.
    COMMAND_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),

    /// How often arrears are recomputed and the overdue policy is applied.
    /// 0 disables the loop entirely.
    COLLECTIONS_INTERVAL_MS: z.coerce.number().int().min(0).default(3_600_000),
    /// Warn the customer once they are this many days overdue.
    WARN_AFTER_DAYS: z.coerce.number().int().min(1).default(7),
    /// Do not warn the same customer again within this many days.
    WARN_COOLDOWN_DAYS: z.coerce.number().int().min(1).default(3),
    /// Lock automatically once this many days overdue — only if enabled below.
    AUTO_LOCK_AFTER_DAYS: z.coerce.number().int().min(1).default(14),
    /// OFF by default. Locking a customer's phone without an operator deciding
    /// to is a policy choice with legal weight, so it must be switched on
    /// deliberately rather than inherited from a default.
    AUTO_LOCK_ENABLED: bool.default("false"),

    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
    RATE_LIMIT_WINDOW: z.string().default("1 minute"),
    /// Destructive device commands get their own, much tighter budget.
    COMMAND_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
    /// Login is the endpoint worth guessing at, so it is tighter still.
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),

    TRUST_PROXY: bool.default("false"),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.MDM_PROVIDER === "mosyle") {
      if (!cfg.MOSYLE_API_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MOSYLE_API_URL"],
          message: "MOSYLE_API_URL is required when MDM_PROVIDER=mosyle",
        });
      }
      if (!cfg.MOSYLE_ACCESS_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MOSYLE_ACCESS_TOKEN"],
          message: "MOSYLE_ACCESS_TOKEN is required when MDM_PROVIDER=mosyle",
        });
      }
      if (!cfg.MOSYLE_EMAIL || !cfg.MOSYLE_PASSWORD) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MOSYLE_EMAIL"],
          message:
            "MOSYLE_EMAIL and MOSYLE_PASSWORD are required when MDM_PROVIDER=mosyle " +
            "(Mosyle issues the Authorization JWT from an administrator login)",
        });
      }
    }

    if (cfg.NODE_ENV === "production") {
      if (cfg.CORS_ORIGINS.split(",").some((o) => o.trim() === "*")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ORIGINS"],
          message: "CORS_ORIGINS must not contain \"*\" in production",
        });
      }
      if (cfg.MDM_PROVIDER === "mock") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MDM_PROVIDER"],
          message:
            "MDM_PROVIDER=mock in production would report locks that never reach a device",
        });
      }
    }
  });

export type Config = z.infer<typeof schema> & { corsOrigins: string[] };

function load(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    // Deliberately not the logger: this runs before the logger exists, and the
    // process is about to die.
    console.error(`Invalid environment configuration:\n${lines.join("\n")}`);
    process.exit(1);
  }
  const value = parsed.data;
  return {
    ...value,
    corsOrigins: value.CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  };
}

export const config: Config = load();
export const isProduction = config.NODE_ENV === "production";
export const isTest = config.NODE_ENV === "test";
