// Zod request-validation schemas.
import { z } from "zod";

export const contractStatus = z.enum(["ACTIVE", "OVERDUE", "PAID", "DEFAULTED"]);
export const lockStatus = z.enum(["LOCKED", "UNLOCKED"]);

export const deviceListQuery = z.object({
  status: contractStatus.optional(),
  lock: lockStatus.optional(),
});

export const lockBody = z.object({
  actorName: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  message: z.string().min(1).default("Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One."),
  phone: z.string().min(1).default("+998 71 200-00-00"),
});

export const unlockBody = z.object({
  actorName: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

export const simpleActionBody = z
  .object({
    actorName: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
  })
  .default({});

export const enrollBody = z.object({
  actorName: z.string().min(1).optional(),
  customer: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    doc: z.string().min(1),
  }),
  contract: z.object({
    number: z.string().min(1),
    amount: z.number().int().nonnegative(),
    monthly: z.number().int().nonnegative(),
    paid: z.number().int().nonnegative().optional(),
    nextPaymentDate: z.string().datetime().or(z.string().date()).nullable().optional(),
    daysOverdue: z.number().int().nonnegative().optional(),
    status: contractStatus.optional(),
  }),
  device: z.object({
    serial: z.string().min(1),
    imei: z.string().min(1),
    model: z.string().min(1),
    ios: z.string().min(1),
  }),
});

export const auditQuery = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type DeviceListQuery = z.infer<typeof deviceListQuery>;
export type LockBody = z.infer<typeof lockBody>;
export type UnlockBody = z.infer<typeof unlockBody>;
export type SimpleActionBody = z.infer<typeof simpleActionBody>;
export type EnrollBody = z.infer<typeof enrollBody>;
