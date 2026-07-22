// MDM abstraction — vendor-neutral contract.
// Business logic depends only on these types, never on a concrete MDM vendor.

export type EnrollmentState = "ENROLLED" | "PENDING" | "RELEASED" | "UNKNOWN";

export interface EnrollmentStatusResult {
  serial: string;
  state: EnrollmentState;
  supervised: boolean;
}

export interface CommandResult {
  ok: boolean;
  /** Vendor command id, if the MDM returned one. */
  commandId?: string;
  /** Vendor-reported status, normalized where possible. */
  status: "PENDING" | "ACKNOWLEDGED" | "ERROR";
  message?: string;
  /** Raw vendor payload for debugging/audit. */
  raw?: unknown;
}

export interface GeoPoint {
  ok: boolean;
  lat?: number;
  lng?: number;
  accuracy?: number;
  timestamp?: string;
  message?: string;
}

export interface LockOptions {
  message: string;
  phone: string;
}

/**
 * DeviceManager — the single interface every MDM vendor adapter implements.
 * Adding a new vendor means adding one file implementing this interface.
 */
export interface DeviceManager {
  readonly provider: string;
  getEnrollmentStatus(serial: string): Promise<EnrollmentStatusResult>;
  lock(serial: string, opts: LockOptions): Promise<CommandResult>;
  unlock(serial: string): Promise<CommandResult>;
  locate(serial: string): Promise<GeoPoint>;
  playSound(serial: string): Promise<CommandResult>;
  removeManagement(serial: string): Promise<CommandResult>;
}

export class MdmError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MdmError";
  }
}
