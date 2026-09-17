// The API surface the screens use. Every method returns view models.

import { query, request, tokenStore } from "./client.js";
import { mapAudit, mapDevice, mapDeviceDetail, mapStats } from "./map.js";
import type {
  ApiAuditEntry,
  ApiPayment,
  ApiPaymentMethod,
  ApiPaymentResponse,
  ApiCommandResponse,
  ApiDevice,
  ApiDeviceDetail,
  ApiLoginResponse,
  ApiPage,
  ApiReadiness,
  ApiStats,
  ApiUser,
} from "./types.js";
import type { AuditEntry, Device, DeviceDetail, Session, Stats } from "../types.js";

export { ApiError, apiBaseUrl, onUnauthorized, tokenStore } from "./client.js";

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface DeviceFilter {
  lock?: string;
  status?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface LockInput {
  message: string;
  phone: string;
  reason?: string;
}

/** A fresh key per operator decision, so a retry is a retry and not a new lock. */
function newIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random()}`;
}

export const api = {
  /* ── Session ─────────────────────────────────────────────────────────── */

  async login(email: string, password: string): Promise<Session> {
    const res = await request<ApiLoginResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    tokenStore.set(res.token);
    return res.user;
  },

  async me(): Promise<Session> {
    const res = await request<{ user: ApiUser }>("/api/auth/me");
    return res.user;
  },

  logout(): void {
    tokenStore.clear();
  },

  changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
    return request("/api/auth/password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
  },

  /* ── Devices ─────────────────────────────────────────────────────────── */

  async stats(): Promise<Stats> {
    return mapStats(await request<ApiStats>("/api/stats"));
  },

  async devices(filter: DeviceFilter = {}): Promise<Page<Device>> {
    const page = await request<ApiPage<ApiDevice>>(
      `/api/devices${query({
        lock: filter.lock,
        status: filter.status,
        search: filter.search,
        limit: filter.limit ?? 100,
        cursor: filter.cursor,
      })}`,
    );
    return { items: page.items.map(mapDevice), nextCursor: page.nextCursor };
  },

  async device(id: string): Promise<DeviceDetail> {
    return mapDeviceDetail(await request<ApiDeviceDetail>(`/api/devices/${id}`));
  },

  async lock(id: string, input: LockInput): Promise<DeviceDetail> {
    const res = await request<ApiCommandResponse>(`/api/devices/${id}/lock`, {
      method: "POST",
      body: input,
      idempotencyKey: newIdempotencyKey(),
    });
    return mapDeviceDetail(res.device);
  },

  async unlock(id: string, reason?: string): Promise<DeviceDetail> {
    const res = await request<ApiCommandResponse>(`/api/devices/${id}/unlock`, {
      method: "POST",
      body: reason ? { reason } : {},
      idempotencyKey: newIdempotencyKey(),
    });
    return mapDeviceDetail(res.device);
  },

  async locate(id: string): Promise<{ ok: boolean; lat?: number; lng?: number; message?: string }> {
    const res = await request<{ result: { ok: boolean; lat?: number; lng?: number; message?: string } }>(
      `/api/devices/${id}/locate`,
      { method: "POST", body: {} },
    );
    return res.result;
  },

  async sound(id: string): Promise<void> {
    await request(`/api/devices/${id}/sound`, { method: "POST", body: {} });
  },

  /* ── Enrollment ──────────────────────────────────────────────────────── */

  async enroll(input: {
    customer: { fullName: string; phone: string; doc: string };
    contract: { number: string; amount: number; monthly: number };
    device: { serial: string; imei: string; model: string; ios: string };
  }): Promise<Device> {
    const dto = await request<ApiDeviceDetail>("/api/enroll", { method: "POST", body: input });
    return mapDevice(dto);
  },

  /* ── Payments ────────────────────────────────────────────────────────── */

  payments(contractId: string): Promise<ApiPayment[]> {
    return request<ApiPayment[]>(`/api/contracts/${contractId}/payments`);
  },

  recordPayment(
    contractId: string,
    input: { amount: number; method?: ApiPaymentMethod; note?: string },
  ): Promise<ApiPaymentResponse> {
    return request<ApiPaymentResponse>(`/api/contracts/${contractId}/payments`, {
      method: "POST",
      body: input,
    });
  },

  /* ── Audit ───────────────────────────────────────────────────────────── */

  async audit(limit = 50, cursor?: string): Promise<Page<AuditEntry>> {
    const page = await request<ApiPage<ApiAuditEntry>>(`/api/audit${query({ limit, cursor })}`);
    return { items: page.items.map(mapAudit), nextCursor: page.nextCursor };
  },

  /* ── Operations ──────────────────────────────────────────────────────── */

  readiness(): Promise<ApiReadiness> {
    return request<ApiReadiness>("/health/ready");
  },

  reconcile(): Promise<{ checked: number; settled: number; failed: number; stillPending: number }> {
    return request("/api/commands/reconcile", { method: "POST", body: {} });
  },
};
