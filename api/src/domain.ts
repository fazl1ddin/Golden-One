// Domain enum values. SQLite stores these as strings; these union types +
// constant arrays keep the rest of the codebase type-safe.

export const ROLES = ["POS_OPERATOR", "COLLECTIONS", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const CONTRACT_STATUSES = [
  "ACTIVE",
  "OVERDUE",
  "PAID",
  "DEFAULTED",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const ENROLLMENT_STATUSES = ["ENROLLED", "PENDING", "RELEASED"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const LOCK_STATUSES = ["LOCKED", "UNLOCKED"] as const;
export type LockStatus = (typeof LOCK_STATUSES)[number];

export const COMMAND_TYPES = [
  "LOCK",
  "UNLOCK",
  "LOCATE",
  "SOUND",
  "REMOVE_MGMT",
] as const;
export type CommandType = (typeof COMMAND_TYPES)[number];

export const COMMAND_STATUSES = ["PENDING", "ACKNOWLEDGED", "ERROR"] as const;
export type CommandStatus = (typeof COMMAND_STATUSES)[number];
