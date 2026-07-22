export type LoanStatus = "active" | "overdue" | "paid";
export type MdmStatus = "enrolled" | "pending" | "released";
export type LockStatus = "locked" | "unlocked";

export interface Device {
  id: string;
  name: string;         // customer full name
  initials: string;
  phone: string;
  model: string;
  serial: string;
  imei: string;
  ios: string;
  contract: string;
  amount: string;
  monthly: string;
  paid: string;
  next: string;
  daysOverdue: number;
  loan: LoanStatus;
  mdm: MdmStatus;
  lock: LockStatus;
  lastSeen: string;
}

export interface AuditEntry {
  who: string;
  act: "evLock" | "evUnlock" | "evEnroll" | "evLocate";
  dev: string;
  t: number; // seconds ago
}

export interface Stats {
  total: number;
  active: number;
  overdue: number;
  locked: number;
  supervised: number;
}
