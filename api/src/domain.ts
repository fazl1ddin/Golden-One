// Domain unions. These mirror the Prisma enums exactly; keeping them here lets
// service code and Zod schemas share one vocabulary without importing Prisma
// everywhere.

export const ROLES = ["POS_OPERATOR", "COLLECTIONS", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const CONTRACT_STATUSES = ["ACTIVE", "OVERDUE", "PAID", "DEFAULTED"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const ENROLLMENT_STATUSES = ["ENROLLED", "PENDING", "RELEASED"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const LOCK_STATUSES = [
  "UNLOCKED",
  "LOCK_PENDING",
  "LOCKED",
  "UNLOCK_PENDING",
] as const;
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

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOCK",
  "UNLOCK",
  "LOCATE",
  "SOUND",
  "ENROLL",
  "RELEASE",
  "USER_CREATE",
  "USER_DISABLE",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * What each role may do. Locking a customer's phone is the most consequential
 * action in the product, so the point-of-sale role — used on a shop counter,
 * often on shared hardware — deliberately cannot do it.
 */
export const PERMISSIONS = {
  "device:read": ["POS_OPERATOR", "COLLECTIONS", "ADMIN"],
  "device:enroll": ["POS_OPERATOR", "ADMIN"],
  "device:lock": ["COLLECTIONS", "ADMIN"],
  "device:unlock": ["COLLECTIONS", "ADMIN"],
  "device:command": ["COLLECTIONS", "ADMIN"],
  "device:release": ["ADMIN"],
  "audit:read": ["COLLECTIONS", "ADMIN"],
  "user:manage": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function roleHas(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
