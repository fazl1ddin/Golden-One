// Wire types — exactly what the API returns.
//
// These mirror the backend's Prisma shapes and are deliberately kept separate
// from the view models in ../types.ts. The mapping between them lives in one
// place (./map.ts), so a backend field rename shows up as a type error there
// rather than as a blank cell somewhere in a screen.

export type ApiRole = "POS_OPERATOR" | "COLLECTIONS" | "ADMIN";
export type ApiContractStatus = "ACTIVE" | "OVERDUE" | "PAID" | "DEFAULTED";
export type ApiEnrollmentStatus = "ENROLLED" | "PENDING" | "RELEASED";
export type ApiLockStatus = "UNLOCKED" | "LOCK_PENDING" | "LOCKED" | "UNLOCK_PENDING";
export type ApiCommandType = "LOCK" | "UNLOCK" | "LOCATE" | "SOUND" | "REMOVE_MGMT";
export type ApiCommandStatus = "PENDING" | "ACKNOWLEDGED" | "ERROR";
export type ApiAuditAction =
  | "LOGIN"
  | "LOCK"
  | "UNLOCK"
  | "LOCATE"
  | "SOUND"
  | "ENROLL"
  | "RELEASE"
  | "USER_CREATE"
  | "USER_DISABLE"
  | "PAYMENT"
  | "WARNING";

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: ApiRole;
}

export interface ApiCustomer {
  id: string;
  fullName: string;
  phone: string;
  doc: string;
}

export interface ApiContract {
  id: string;
  number: string;
  amount: number;
  monthly: number;
  paid: number;
  nextPaymentDate: string | null;
  daysOverdue: number;
  status: ApiContractStatus;
  /** What clears the arrears today, in whole so'm. 0 when the contract is current. */
  arrears: number;
}

export interface ApiDevice {
  id: string;
  serial: string;
  imei: string;
  model: string;
  ios: string;
  supervised: boolean;
  enrollmentStatus: ApiEnrollmentStatus;
  lockStatus: ApiLockStatus;
  lastSeenAt: string | null;
  customer: ApiCustomer;
  contract: ApiContract;
}

export interface ApiCommand {
  id: string;
  deviceId: string;
  type: ApiCommandType;
  status: ApiCommandStatus;
  provider: string;
  error: string | null;
  attempts: number;
  createdAt: string;
  settledAt: string | null;
}

export interface ApiAuditEntry {
  id: string;
  actorName: string;
  actorId: string | null;
  action: ApiAuditAction;
  deviceId: string | null;
  contractId: string | null;
  reason: string | null;
  ip: string | null;
  createdAt: string;
}

export interface ApiDeviceDetail extends ApiDevice {
  commands: ApiCommand[];
  audit: ApiAuditEntry[];
}

export type ApiPaymentMethod = "CASH" | "CARD" | "TRANSFER" | "OTHER";

export interface ApiPayment {
  id: string;
  contractId: string;
  amount: number;
  method: ApiPaymentMethod;
  note: string | null;
  createdAt: string;
  recordedBy: { id: string; name: string } | null;
}

export interface ApiPaymentResponse {
  payment: ApiPayment;
  contract: ApiContract;
  /** Devices released automatically because the arrears were cleared. */
  autoUnlockedDeviceIds: string[];
}

export interface ApiStats {
  totalDevices: number;
  supervised: number;
  activeContracts: number;
  overdueContracts: number;
  lockedDevices: number;
  pendingCommands: number;
}

export interface ApiPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiLoginResponse {
  token: string;
  user: ApiUser;
}

export interface ApiCommandResponse {
  device: ApiDeviceDetail;
  command: ApiCommand;
  replayed: boolean;
}

export interface ApiReadiness {
  status: string;
  env: string;
  checks: { database: string; mdmProvider: string };
}
