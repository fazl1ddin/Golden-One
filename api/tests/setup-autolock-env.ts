// Turns the overdue policy's auto-lock on for auto-lock.test.ts only.
// Imported before ./helpers.js, whose defaults are all ??=.
process.env.AUTO_LOCK_ENABLED = "true";
process.env.AUTO_LOCK_AFTER_DAYS = "14";
process.env.WARN_AFTER_DAYS = "7";
