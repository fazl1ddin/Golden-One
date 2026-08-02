// Tight rate-limit ceilings for rate-limit.test.ts.
//
// Imported before ./helpers.js (and therefore before setup-env.ts, whose values
// are all ??=), so these win. node:test runs each file in its own process, so
// this does not leak into the other suites.

process.env.LOGIN_RATE_LIMIT_MAX = "3";
process.env.COMMAND_RATE_LIMIT_MAX = "2";
