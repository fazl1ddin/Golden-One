// Wire → view model.
//
// The only place that knows both shapes. Everything the screens render is
// derived here, including the formatting decisions (money grouping, relative
// times), so a table cell and a detail row can never disagree about how the
// same field looks.

import type {
  ApiAuditEntry,
  ApiContractStatus,
  ApiDevice,
  ApiDeviceDetail,
  ApiEnrollmentStatus,
  ApiLockStatus,
  ApiStats,
} from "./types.js";
import type {
  AuditEntry,
  Device,
  DeviceDetail,
  LoanStatus,
  LockStatus,
  MdmStatus,
  Stats,
} from "../types.js";

const LOAN: Record<ApiContractStatus, LoanStatus> = {
  ACTIVE: "active",
  OVERDUE: "overdue",
  PAID: "paid",
  DEFAULTED: "defaulted",
};

const MDM: Record<ApiEnrollmentStatus, MdmStatus> = {
  ENROLLED: "enrolled",
  PENDING: "pending",
  RELEASED: "released",
};

const LOCK: Record<ApiLockStatus, LockStatus> = {
  UNLOCKED: "unlocked",
  LOCK_PENDING: "lockPending",
  LOCKED: "locked",
  UNLOCK_PENDING: "unlockPending",
};

/** "9 800 000" — narrow no-break spaces would fight the monospace column. */
export function money(value: number): string {
  return value.toLocaleString("ru-RU").replace(/ /g, " ");
}

export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isoDate(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

export function mapDevice(dto: ApiDevice): Device {
  return {
    id: dto.id,
    name: dto.customer.fullName,
    initials: initialsOf(dto.customer.fullName),
    phone: dto.customer.phone,
    doc: dto.customer.doc,
    model: dto.model,
    serial: dto.serial,
    imei: dto.imei,
    ios: dto.ios,
    supervised: dto.supervised,
    contract: dto.contract.number,
    amount: money(dto.contract.amount),
    monthly: money(dto.contract.monthly),
    paid: money(dto.contract.paid),
    next: isoDate(dto.contract.nextPaymentDate),
    daysOverdue: dto.contract.daysOverdue,
    loan: LOAN[dto.contract.status],
    mdm: MDM[dto.enrollmentStatus],
    lock: LOCK[dto.lockStatus],
    lastSeenAt: dto.lastSeenAt,
  };
}

export function mapDeviceDetail(dto: ApiDeviceDetail): DeviceDetail {
  return {
    ...mapDevice(dto),
    commands: dto.commands.map((c) => ({
      id: c.id,
      type: c.type,
      status: c.status,
      error: c.error,
      attempts: c.attempts,
      createdAt: c.createdAt,
      settledAt: c.settledAt,
    })),
    audit: dto.audit.map(mapAudit),
  };
}

export function mapAudit(dto: ApiAuditEntry): AuditEntry {
  return {
    id: dto.id,
    who: dto.actorName,
    action: dto.action,
    deviceId: dto.deviceId,
    reason: dto.reason,
    ip: dto.ip,
    createdAt: dto.createdAt,
  };
}

export function mapStats(dto: ApiStats): Stats {
  return {
    total: dto.totalDevices,
    supervised: dto.supervised,
    active: dto.activeContracts,
    overdue: dto.overdueContracts,
    locked: dto.lockedDevices,
    pendingCommands: dto.pendingCommands,
  };
}
