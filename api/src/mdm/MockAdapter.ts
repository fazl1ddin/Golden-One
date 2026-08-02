// MockAdapter — in-memory MDM for local development and tests.
//
// It deliberately mimics the *shape* of real Apple MDM rather than being an
// always-succeeds stub: a command comes back PENDING (queued for APNs delivery)
// and only settles once someone asks for its status. An adapter that
// acknowledged instantly would hide the exact failure this system exists to
// handle — a phone that is switched off never receives the lock.

import type {
  CommandResult,
  DeviceManager,
  EnrollmentStatusResult,
  GeoPoint,
  LockOptions,
} from "./types.js";

interface MockCommand {
  serial: string;
  type: string;
  /** How many status polls remain before this command settles. */
  settleAfter: number;
  outcome: "ACKNOWLEDGED" | "ERROR";
}

export interface MockAdapterOptions {
  /**
   * How many status polls come back PENDING before the command settles.
   * 0 (default) means the first poll settles it — the device checked in
   * promptly. Raise it to simulate a phone that takes a while to appear.
   */
  settleAfterPolls?: number;
  /** Serials that never acknowledge, standing in for a powered-off phone. */
  offlineSerials?: Set<string>;
  quiet?: boolean;
}

export class MockAdapter implements DeviceManager {
  readonly provider = "mock";
  private readonly commands = new Map<string, MockCommand>();
  private counter = 0;

  constructor(private readonly options: MockAdapterOptions = {}) {}

  private log(action: string, serial: string, extra?: unknown): void {
    if (this.options.quiet) return;
    console.log(
      `[mdm:mock] ${action} serial=${serial}`,
      extra !== undefined ? extra : "",
    );
  }

  private queue(type: string, serial: string): CommandResult {
    const id = `mock-${type}-${++this.counter}`;
    const offline = this.options.offlineSerials?.has(serial) ?? false;

    this.commands.set(id, {
      serial,
      type,
      settleAfter: offline
        ? Number.POSITIVE_INFINITY
        : (this.options.settleAfterPolls ?? 0),
      outcome: "ACKNOWLEDGED",
    });

    // Issuing a command is always just "queued" — exactly as Apple MDM behaves.
    // The outcome only becomes known via getCommandStatus.
    return {
      ok: true,
      commandId: id,
      status: "PENDING",
      message: `${type} queued for delivery (mock)`,
    };
  }

  async getEnrollmentStatus(serial: string): Promise<EnrollmentStatusResult> {
    this.log("getEnrollmentStatus", serial);
    return { serial, state: "ENROLLED", supervised: true };
  }

  async lock(serial: string, opts: LockOptions): Promise<CommandResult> {
    this.log("lock (Lost Mode ON)", serial, opts);
    return this.queue("lock", serial);
  }

  async unlock(serial: string): Promise<CommandResult> {
    this.log("unlock (Lost Mode OFF)", serial);
    return this.queue("unlock", serial);
  }

  async locate(serial: string): Promise<GeoPoint> {
    this.log("locate", serial);
    if (this.options.offlineSerials?.has(serial)) {
      return { ok: false, message: "Device has not checked in (mock)" };
    }
    return {
      ok: true,
      lat: 41.311081,
      lng: 69.240562,
      accuracy: 25,
      timestamp: new Date().toISOString(),
      message: "Location returned (mock)",
    };
  }

  async playSound(serial: string): Promise<CommandResult> {
    this.log("playSound", serial);
    return this.queue("sound", serial);
  }

  async removeManagement(serial: string): Promise<CommandResult> {
    this.log("removeManagement", serial);
    return this.queue("remove", serial);
  }

  async getCommandStatus(
    serial: string,
    providerCommandId: string,
  ): Promise<CommandResult> {
    const cmd = this.commands.get(providerCommandId);
    if (!cmd) {
      return {
        ok: false,
        commandId: providerCommandId,
        status: "ERROR",
        message: "Unknown command id (mock)",
      };
    }

    if (cmd.settleAfter > 0) {
      cmd.settleAfter -= 1;
      return {
        ok: true,
        commandId: providerCommandId,
        status: "PENDING",
        message: "Awaiting device check-in (mock)",
      };
    }

    return {
      ok: cmd.outcome === "ACKNOWLEDGED",
      commandId: providerCommandId,
      status: cmd.outcome,
      message: `${cmd.type} ${cmd.outcome.toLowerCase()} on ${serial} (mock)`,
    };
  }
}
