// MockAdapter — in-memory MDM that always succeeds.
// Default for local/dev so the full lock/unlock flow works without a real MDM vendor.

import type {
  CommandResult,
  DeviceManager,
  EnrollmentStatusResult,
  GeoPoint,
  LockOptions,
} from "./types.js";

export class MockAdapter implements DeviceManager {
  readonly provider = "mock";

  private log(action: string, serial: string, extra?: unknown): void {
    // eslint-disable-next-line no-console
    console.log(
      `[mdm:mock] ${action} serial=${serial}`,
      extra !== undefined ? extra : "",
    );
  }

  private commandId(prefix: string): string {
    return `mock-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  async getEnrollmentStatus(serial: string): Promise<EnrollmentStatusResult> {
    this.log("getEnrollmentStatus", serial);
    return { serial, state: "ENROLLED", supervised: true };
  }

  async lock(serial: string, opts: LockOptions): Promise<CommandResult> {
    this.log("lock (Lost Mode ON)", serial, opts);
    return {
      ok: true,
      commandId: this.commandId("lock"),
      status: "ACKNOWLEDGED",
      message: "Lost Mode enabled (mock)",
      raw: { serial, ...opts },
    };
  }

  async unlock(serial: string): Promise<CommandResult> {
    this.log("unlock (Lost Mode OFF)", serial);
    return {
      ok: true,
      commandId: this.commandId("unlock"),
      status: "ACKNOWLEDGED",
      message: "Lost Mode disabled (mock)",
    };
  }

  async locate(serial: string): Promise<GeoPoint> {
    this.log("locate", serial);
    // Deterministic pseudo-location near Tashkent for demo purposes.
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
    return {
      ok: true,
      commandId: this.commandId("sound"),
      status: "ACKNOWLEDGED",
      message: "Sound played (mock)",
    };
  }

  async removeManagement(serial: string): Promise<CommandResult> {
    this.log("removeManagement", serial);
    return {
      ok: true,
      commandId: this.commandId("remove"),
      status: "ACKNOWLEDGED",
      message: "Management profile removed (mock)",
    };
  }
}
