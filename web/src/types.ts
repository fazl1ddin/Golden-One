// View models — what the screens render. Mapped from the wire types in
// src/api/types.ts by src/api/map.ts.

import type { ApiAuditAction, ApiCommandStatus, ApiCommandType, ApiRole } from "./api/types.js";

export type LoanStatus = "active" | "overdue" | "paid" | "defaulted";
export type MdmStatus = "enrolled" | "pending" | "released";

/**
 * A lock is not a boolean. The MDM only queues a command; a phone that is
 * switched off may not apply it for hours, so the pending states are shown to
 * the operator rather than hidden behind an optimistic "locked".
 */
export type LockStatus = "unlocked" | "lockPending" | "locked" | "unlockPending";

export interface Device {
  id: string;
  name: string; // customer full name
  initials: string;
  phone: string;
  doc: string;
  model: string;
  serial: string;
  imei: string;
  ios: string;
  supervised: boolean;
  contractId: string;
  contract: string;
  amount: string; // preformatted for display
  monthly: string;
  paid: string;
  next: string;
  /** Preformatted for display; "" when nothing is in arrears. */
  arrears: string;
  /** Raw so'm, so the payment form can default to it without reparsing. */
  arrearsValue: number;
  daysOverdue: number;
  loan: LoanStatus;
  mdm: MdmStatus;
  lock: LockStatus;
  lastSeenAt: string | null;
}

export interface DeviceCommand {
  id: string;
  type: ApiCommandType;
  status: ApiCommandStatus;
  error: string | null;
  attempts: number;
  createdAt: string;
  settledAt: string | null;
}

export interface DeviceDetail extends Device {
  commands: DeviceCommand[];
  audit: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  who: string;
  action: ApiAuditAction;
  deviceId: string | null;
  reason: string | null;
  ip: string | null;
  createdAt: string;
}

export interface Stats {
  total: number;
  supervised: number;
  active: number;
  overdue: number;
  locked: number;
  pendingCommands: number;
}

export interface Session {
  id: string;
  email: string;
  name: string;
  role: ApiRole;
}

/** Mirrors the backend's permission table so the UI hides what it cannot do. */
const PERMISSIONS = {
  "device:enroll": ["POS_OPERATOR", "ADMIN"],
  "device:lock": ["COLLECTIONS", "ADMIN"],
  "device:command": ["COLLECTIONS", "ADMIN"],
  "device:release": ["ADMIN"],
  "contract:payment": ["COLLECTIONS", "ADMIN"],
  "audit:read": ["COLLECTIONS", "ADMIN"],
  "user:manage": ["ADMIN"],
} as const satisfies Record<string, readonly ApiRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: ApiRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly ApiRole[]).includes(role);
}
