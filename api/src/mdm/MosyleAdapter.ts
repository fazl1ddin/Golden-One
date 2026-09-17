// MosyleAdapter — Mosyle Business.
//
// ⚠️ ENDPOINT PATHS ARE UNVERIFIED. Mosyle publishes its API reference behind a
// customer portal, so the paths in ENDPOINTS below are a reasonable design, not
// a confirmed contract. They are gathered in one place precisely so reconciling
// them with the real documentation is a small, contained edit. Everything else
// here — the credential model, retry-on-expiry, status mapping — is independent
// of those strings.
//
// Credentials: Mosyle uses TWO distinct secrets. `accessToken` is the API key
// issued in the Mosyle console and travels in the request body; the
// Authorization header carries a short-lived JWT obtained by logging in with an
// administrator account. Since February 2024 Mosyle requires the JWT — sending
// the API key as the bearer (which an earlier version of this adapter did) is
// not the documented scheme and will be rejected.

import {
  MdmError,
  type CommandResult,
  type DeviceManager,
  type EnrollmentStatusResult,
  type GeoPoint,
  type LockOptions,
} from "./types.js";

/** Every Mosyle path this adapter uses. Reconcile these with the live docs. */
const ENDPOINTS = {
  login: "/login",
  command: "/devices/command",
  lookup: "/devices/lookup",
  commandStatus: "/devices/command/status",
} as const;

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

export interface MosyleAdapterOptions {
  /** Injected in tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export class MosyleAdapter implements DeviceManager {
  readonly provider = "mosyle";
  private readonly fetchImpl: typeof fetch;
  /** Cached bearer, re-obtained on expiry rather than on every call. */
  private jwt: string | null = null;

  constructor(options: MosyleAdapterOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private config() {
    const apiUrl = process.env.MOSYLE_API_URL?.trim();
    const accessToken = process.env.MOSYLE_ACCESS_TOKEN?.trim();
    const email = process.env.MOSYLE_EMAIL?.trim();
    const password = process.env.MOSYLE_PASSWORD?.trim();

    if (!apiUrl || !accessToken) {
      throw new MdmError(
        "Mosyle adapter is not configured: set MOSYLE_API_URL and MOSYLE_ACCESS_TOKEN.",
        this.provider,
      );
    }
    if (!email || !password) {
      throw new MdmError(
        "Mosyle adapter is not configured: set MOSYLE_EMAIL and MOSYLE_PASSWORD — " +
          "Mosyle requires an administrator JWT in addition to the API access token.",
        this.provider,
      );
    }
    return { apiUrl: apiUrl.replace(/\/+$/, ""), accessToken, email, password };
  }

  /** Exchanges the administrator credentials for a bearer JWT. */
  private async authenticate(): Promise<string> {
    const { apiUrl, accessToken, email, password } = this.config();

    let res: Response;
    try {
      res = await this.fetchImpl(`${apiUrl}${ENDPOINTS.login}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ accessToken, email, password }),
      });
    } catch (err) {
      throw new MdmError("Mosyle login failed (network)", this.provider, err);
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new MdmError(
        `Mosyle login rejected (${res.status}): ${String(body.message ?? res.statusText)}`,
        this.provider,
        body,
      );
    }

    const token =
      (body.token as string | undefined) ??
      (body.jwt as string | undefined) ??
      (body.access_token as string | undefined);
    if (!token) {
      throw new MdmError("Mosyle login returned no token", this.provider, body);
    }

    this.jwt = token;
    return token;
  }

  private async bearer(): Promise<string> {
    return this.jwt ?? (await this.authenticate());
  }

  /**
   * One authenticated call. A 401 is retried exactly once with a fresh token:
   * the JWT is short-lived, and an expiry must not surface as a failed lock.
   */
  private async post(path: string, payload: Record<string, unknown>): Promise<MosyleResponse> {
    const { apiUrl, accessToken } = this.config();

    const send = async (token: string): Promise<Response> =>
      this.fetchImpl(`${apiUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          accept: "application/json",
        },
        body: JSON.stringify({ accessToken, ...payload }),
      });

    let res: Response;
    try {
      res = await send(await this.bearer());
      if (res.status === 401) {
        this.jwt = null;
        res = await send(await this.authenticate());
      }
    } catch (err) {
      if (err instanceof MdmError) throw err;
      throw new MdmError(`Mosyle request failed (network) for ${path}`, this.provider, err);
    }

    const body = (await res.json().catch(() => ({}))) as MosyleResponse;
    if (!res.ok) {
      throw new MdmError(
        `Mosyle API error ${res.status} for ${path}: ${body.message ?? res.statusText}`,
        this.provider,
        body,
      );
    }
    return body;
  }

  private command(
    operation: MosyleOperation,
    serial: string,
    extra: Record<string, unknown> = {},
  ): Promise<MosyleResponse> {
    return this.post(ENDPOINTS.command, { operation, serialNumber: serial, ...extra });
  }

  private toCommandResult(body: MosyleResponse): CommandResult {
    const raw = (body.status ?? "").toUpperCase();
    const status: CommandResult["status"] =
      raw === "ACKNOWLEDGED" || raw === "COMPLETE"
        ? "ACKNOWLEDGED"
        : raw === "ERROR" || raw === "FAILED"
          ? "ERROR"
          // Anything Mosyle has accepted but not yet confirmed stays PENDING:
          // an unrecognised status must never be read as "the phone is locked".
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
    const body = await this.post(ENDPOINTS.lookup, { serialNumber: serial });
    const state = (body.device?.enrollmentStatus ?? "UNKNOWN").toUpperCase();
    const normalized =
      state === "ENROLLED" || state === "PENDING" || state === "RELEASED"
        ? (state as EnrollmentStatusResult["state"])
        : "UNKNOWN";
    return { serial, state: normalized, supervised: body.device?.supervised ?? false };
  }

  async lock(serial: string, opts: LockOptions): Promise<CommandResult> {
    return this.toCommandResult(
      await this.command("EnableLostMode", serial, {
        lostModeMessage: opts.message,
        lostModePhoneNumber: opts.phone,
      }),
    );
  }

  async unlock(serial: string): Promise<CommandResult> {
    return this.toCommandResult(await this.command("DisableLostMode", serial));
  }

  async locate(serial: string): Promise<GeoPoint> {
    const body = await this.command("DeviceLocation", serial);
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
    return this.toCommandResult(await this.command("PlayLostModeSound", serial));
  }

  async removeManagement(serial: string): Promise<CommandResult> {
    return this.toCommandResult(await this.command("RemoveManagement", serial));
  }

  async getCommandStatus(serial: string, providerCommandId: string): Promise<CommandResult> {
    const body = await this.post(ENDPOINTS.commandStatus, {
      serialNumber: serial,
      commandId: providerCommandId,
    });
    return { ...this.toCommandResult(body), commandId: providerCommandId };
  }
}
