// Zod request-validation schemas. These are the API's contract; anything not
// described here is rejected before it reaches a service.
import { z } from "zod";
import { AUDIT_ACTIONS, CONTRACT_STATUSES, LOCK_STATUSES, ROLES } from "./domain.js";

export const contractStatus = z.enum(CONTRACT_STATUSES);
export const lockStatus = z.enum(LOCK_STATUSES);
export const role = z.enum(ROLES);
export const auditAction = z.enum(AUDIT_ACTIONS);

const cursorPage = {
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional(),
};

export const deviceListQuery = z.object({
  status: contractStatus.optional(),
  lock: lockStatus.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  ...cursorPage,
});

/**
 * The lock message is what the customer reads on the seized phone, so it is
 * required rather than defaulted — an operator must consciously choose the
 * wording, and the contact number has to be one that is actually answered.
 */
export const lockBody = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  message: z.string().trim().min(1).max(500),
  phone: z.string().trim().min(3).max(40),
});

export const unlockBody = z
  .object({ reason: z.string().trim().min(1).max(500).optional() })
  .default({});

export const simpleActionBody = z
  .object({ reason: z.string().trim().min(1).max(500).optional() })
  .default({});

export const enrollBody = z.object({
  customer: z.object({
    fullName: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(3).max(40),
    doc: z.string().trim().min(1).max(100),
  }),
  contract: z.object({
    number: z.string().trim().min(1).max(60),
    amount: z.number().int().nonnegative(),
    monthly: z.number().int().nonnegative(),
    paid: z.number().int().nonnegative().optional(),
    nextPaymentDate: z
      .string()
      .datetime()
      .or(z.string().date())
      .nullable()
      .optional(),
    daysOverdue: z.number().int().nonnegative().optional(),
    status: contractStatus.optional(),
  }),
  device: z.object({
    // Apple serials are alphanumeric; IMEIs are exactly 15 digits. Rejecting
    // malformed values here stops a typo from creating a device record that can
    // never be matched to a real phone.
    serial: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{8,14}$/, "Serial must be 8–14 alphanumeric characters"),
    imei: z.string().trim().regex(/^\d{15}$/, "IMEI must be exactly 15 digits"),
    model: z.string().trim().min(1).max(60),
    ios: z.string().trim().min(1).max(20),
  }),
});

export const auditQuery = z.object({
  ...cursorPage,
  deviceId: z.string().min(1).optional(),
  action: auditAction.optional(),
});

export const loginBody = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

/**
 * Length is the control that matters; complexity rules push people toward
 * predictable substitutions. 12 characters is the floor for an account that can
 * lock a customer's phone.
 */
const strongPassword = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200);

export const createUserBody = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().min(1).max(200),
  password: strongPassword,
  role,
});

export const setUserActiveBody = z.object({ active: z.boolean() });

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: strongPassword,
});

export type DeviceListQuery = z.infer<typeof deviceListQuery>;
export type LockBody = z.infer<typeof lockBody>;
export type UnlockBody = z.infer<typeof unlockBody>;
export type SimpleActionBody = z.infer<typeof simpleActionBody>;
export type EnrollBody = z.infer<typeof enrollBody>;
export type AuditQuery = z.infer<typeof auditQuery>;
export type LoginBody = z.infer<typeof loginBody>;
export type CreateUserBody = z.infer<typeof createUserBody>;
