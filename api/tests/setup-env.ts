// Test environment defaults.
//
// This must be a separate module imported *first*: ESM evaluates imports before
// the importing module's own statements, so assigning process.env at the top of
// a test file would happen after src/config.ts has already read it.
//
// Every value uses ??= so a suite that needs different settings can set them in
// a module imported ahead of this one (see setup-ratelimit-env.ts).

process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "test-secret-at-least-32-characters-long-000";
process.env.MDM_PROVIDER ??= "mock";
process.env.RECONCILE_INTERVAL_MS ??= "0";
process.env.LOG_LEVEL ??= "silent";

// Rate limiting is exercised deliberately in rate-limit.test.ts. Everywhere
// else it must not interfere with suites that log in dozens of times.
process.env.RATE_LIMIT_MAX ??= "100000";
process.env.LOGIN_RATE_LIMIT_MAX ??= "100000";
process.env.COMMAND_RATE_LIMIT_MAX ??= "100000";
