// MosyleAdapter — real-shape adapter for the Mosyle MDM API.
//
// This implements a reasonable request/response shaping for Mosyle's device
// command endpoints. Mosyle's production API details (exact paths, auth) can be
// swapped here without touching any business logic, because everything upstream
// depends only on the DeviceManager interface.
//
// It reads MOSYLE_API_URL and MOSYLE_ACCESS_TOKEN from the environment and
// throws a clear MdmError if they are unset, so misconfiguration fails loudly
// rather than silently no-op'ing in production.

import {
  MdmError,
  type CommandResult,
  type DeviceManager,
  type EnrollmentStatusResult,
  type GeoPoint,
  type LockOptions,
} from "./types.js";

interface MosyleConfig {
  apiUrl: string;
  accessToken: string;
}

/** Operations Mosyle accepts for a supervised device. */
type MosyleOperation =
  | "EnableLostMode"
  | "DisableLostMode"
  | "DeviceLocation"
  | "PlayLostModeSound"
  | "RemoveManagement";

interface MosyleResponse {
  status?: string;
  commandId?: string;
  message?: string;
  location?: { lat?: number; lng?: number; accuracy?: number; timestamp?: string };
  device?: { enrollmentStatus?: string; supervised?: boolean };
  [k: string]: unknown;
}

export class MosyleAdapter implements DeviceManager {
  readonly provider = "mosyle";

  private readConfig(): MosyleConfig {
    const apiUrl = process.env.MOSYLE_API_URL?.trim();
    const accessToken = process.env.MOSYLE_ACCESS_TOKEN?.trim();
    if (!apiUrl || !accessToken) {
      throw new MdmError(
        "Mosyle adapter is not configured: set MOSYLE_API_URL and MOSYLE_ACCESS_TOKEN.",
        this.provider,
      );
    }
    return { apiUrl, accessToken };
  }

  private async call(
    operation: MosyleOperation,
    serial: string,
    extra: Record<string, unknown> = {},
  ): Promise<MosyleResponse> {
    const { apiUrl, accessToken } = this.readConfig();
    const url = `${apiUrl.replace(/\/+$/, "")}/devices/command`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
        body: JSON.stringify({
          accessToken,
          operation,
          serialNumber: serial,
          ...extra,
        }),
      });
    } catch (err) {
      throw new MdmError(
        `Mosyle request failed (network) for ${operation} on ${serial}`,
        this.provider,
        err,
      );
    }

    let body: MosyleResponse;
    try {
      body = (await res.json()) as MosyleResponse;
    } catch {
      body = {};
    }

    if (!res.ok) {
      throw new MdmError(
        `Mosyle API error ${res.status} for ${operation} on ${serial}: ${
          body.message ?? res.statusText
        }`,
        this.provider,
        body,
      );
    }

    return body;
  }

  private toCommandResult(body: MosyleResponse): CommandResult {
    const rawStatus = (body.status ?? "").toUpperCase();
    const status: CommandResult["status"] =
      rawStatus === "ACKNOWLEDGED" || rawStatus === "COMPLETE"
        ? "ACKNOWLEDGED"
        : rawStatus === "ERROR" || rawStatus === "FAILED"
          ? "ERROR"
          : "PENDING";
    return {
      ok: status !== "ERROR",
      commandId: body.commandId,
      status,
      message: body.message,
      raw: body,
    };
  }

  async getEnrollmentStatus(serial: string): Promise<EnrollmentStatusResult> {
    const { apiUrl, accessToken } = this.readConfig();
    const url = `${apiUrl.replace(/\/+$/, "")}/devices/lookup`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accessToken, serialNumber: serial }),
      });
    } catch (err) {
      throw new MdmError(
        `Mosyle lookup failed for ${serial}`,
        this.provider,
        err,
      );
    }
    const body = (await res.json().catch(() => ({}))) as MosyleResponse;
    if (!res.ok) {
      throw new MdmError(
        `Mosyle lookup error ${res.status} for ${serial}`,
        this.provider,
        body,
      );
    }
    const state = (body.device?.enrollmentStatus ?? "UNKNOWN").toUpperCase();
    const normalized =
      state === "ENROLLED" || state === "PENDING" || state === "RELEASED"
        ? (state as EnrollmentStatusResult["state"])
        : "UNKNOWN";
    return {
      serial,
      state: normalized,
      supervised: body.device?.supervised ?? false,
    };
  }

  async lock(serial: string, opts: LockOptions): Promise<CommandResult> {
    const body = await this.call("EnableLostMode", serial, {
      lostModeMessage: opts.message,
      lostModePhoneNumber: opts.phone,
    });
    return this.toCommandResult(body);
  }

  async unlock(serial: string): Promise<CommandResult> {
    const body = await this.call("DisableLostMode", serial);
    return this.toCommandResult(body);
  }

  async locate(serial: string): Promise<GeoPoint> {
    const body = await this.call("DeviceLocation", serial);
    const loc = body.location;
    return {
      ok: Boolean(loc),
      lat: loc?.lat,
      lng: loc?.lng,
      accuracy: loc?.accuracy,
      timestamp: loc?.timestamp,
      message: body.message,
    };
  }

  async playSound(serial: string): Promise<CommandResult> {
    const body = await this.call("PlayLostModeSound", serial);
    return this.toCommandResult(body);
  }

  async removeManagement(serial: string): Promise<CommandResult> {
    const body = await this.call("RemoveManagement", serial);
    return this.toCommandResult(body);
  }

  async getCommandStatus(
    serial: string,
    providerCommandId: string,
  ): Promise<CommandResult> {
    const { apiUrl, accessToken } = this.readConfig();
    const url = `${apiUrl.replace(/\/+$/, "")}/devices/command/status`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
        body: JSON.stringify({ accessToken, serialNumber: serial, commandId: providerCommandId }),
      });
    } catch (err) {
      throw new MdmError(
        `Mosyle status check failed for command ${providerCommandId}`,
        this.provider,
        err,
      );
    }

    const body = (await res.json().catch(() => ({}))) as MosyleResponse;
    if (!res.ok) {
      throw new MdmError(
        `Mosyle status error ${res.status} for command ${providerCommandId}`,
        this.provider,
        body,
      );
    }
    return { ...this.toCommandResult(body), commandId: providerCommandId };
  }
}
