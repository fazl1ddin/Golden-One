import type { Device, AuditEntry, Stats, LockStatus } from "./types";

/**
 * Data layer. Defaults to an in-memory mock so the app runs standalone.
 * When VITE_API_URL is set, calls the real backend (api/) — see fetchClient.
 */
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const seedDevices: Device[] = [
  { id: "d1", name: "Дилшод Рахимов", initials: "ДР", phone: "+998 90 123-45-67", model: "iPhone 15", serial: "F2LW9K3QH1", imei: "356728111234567", ios: "17.5", contract: "GO-2024-0417", amount: "9 800 000", monthly: "980 000", paid: "2 940 000", next: "2026-07-10", daysOverdue: 12, loan: "overdue", mdm: "enrolled", lock: "unlocked", lastSeen: "2 ч" },
  { id: "d2", name: "Нигора Юсупова", initials: "НЮ", phone: "+998 91 222-33-44", model: "iPhone 14", serial: "G8XM2P0RT4", imei: "356728119876543", ios: "17.4", contract: "GO-2024-0389", amount: "8 200 000", monthly: "820 000", paid: "820 000", next: "2026-06-28", daysOverdue: 24, loan: "overdue", mdm: "enrolled", lock: "locked", lastSeen: "5 ч" },
  { id: "d3", name: "Сардор Алиев", initials: "СА", phone: "+998 93 555-66-77", model: "iPhone 15 Pro", serial: "H1KD7L9WQ2", imei: "356728115556677", ios: "17.5", contract: "GO-2025-0102", amount: "14 500 000", monthly: "1 208 000", paid: "7 250 000", next: "2026-08-05", daysOverdue: 0, loan: "active", mdm: "enrolled", lock: "unlocked", lastSeen: "10 мин" },
  { id: "d4", name: "Малика Ниязова", initials: "МН", phone: "+998 90 888-99-00", model: "iPhone 13", serial: "J3PR5T2XN8", imei: "356728113334455", ios: "17.3", contract: "GO-2025-0148", amount: "6 900 000", monthly: "690 000", paid: "4 830 000", next: "2026-08-01", daysOverdue: 6, loan: "overdue", mdm: "enrolled", lock: "unlocked", lastSeen: "1 ч" },
  { id: "d5", name: "Тимур Бекмуратов", initials: "ТБ", phone: "+998 94 111-22-33", model: "iPhone 15", serial: "K9WL3M1QP7", imei: "356728118887766", ios: "17.5", contract: "GO-2025-0201", amount: "9 800 000", monthly: "980 000", paid: "980 000", next: "2026-07-18", daysOverdue: 4, loan: "overdue", mdm: "enrolled", lock: "unlocked", lastSeen: "30 мин" },
  { id: "d6", name: "Гульнора Сафарова", initials: "ГС", phone: "+998 91 444-55-66", model: "iPhone 14 Pro", serial: "L2MN8K4RT9", imei: "356728112223344", ios: "17.4", contract: "GO-2024-0356", amount: "13 200 000", monthly: "1 100 000", paid: "13 200 000", next: "—", daysOverdue: 0, loan: "paid", mdm: "released", lock: "unlocked", lastSeen: "3 дн" },
];

let devices: Device[] = seedDevices.map((d) => ({ ...d }));
let audit: AuditEntry[] = [
  { who: "Азиз Каримов", act: "evLock", dev: "Нигора Юсупова", t: 8 },
  { who: "Система", act: "evEnroll", dev: "Тимур Бекмуратов", t: 180 },
  { who: "Азиз Каримов", act: "evLocate", dev: "Дилшод Рахимов", t: 320 },
];

const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));

export interface LockOptions { reason: string; message: string; phone: string; actor?: string }

export const api = {
  usingRealBackend: Boolean(API_URL),

  async stats(): Promise<Stats> {
    if (API_URL) return fetchJson<Stats>("/api/stats");
    return delay({
      total: devices.length,
      active: devices.filter((d) => d.loan === "active").length,
      overdue: devices.filter((d) => d.loan === "overdue").length,
      locked: devices.filter((d) => d.lock === "locked").length,
      supervised: devices.filter((d) => d.mdm === "enrolled").length,
    });
  },

  async listDevices(): Promise<Device[]> {
    if (API_URL) return fetchJson<Device[]>("/api/devices");
    return delay(devices.map((d) => ({ ...d })));
  },

  async getDevice(id: string): Promise<Device | undefined> {
    if (API_URL) return fetchJson<Device>(`/api/devices/${id}`);
    return delay(devices.find((d) => d.id === id));
  },

  async audit(): Promise<AuditEntry[]> {
    if (API_URL) return fetchJson<AuditEntry[]>("/api/audit");
    return delay([...audit]);
  },

  async setLock(id: string, next: LockStatus, opts?: LockOptions): Promise<Device> {
    if (API_URL) {
      const path = next === "locked" ? `/api/devices/${id}/lock` : `/api/devices/${id}/unlock`;
      return fetchJson<Device>(path, { method: "POST", body: JSON.stringify(opts ?? {}) });
    }
    const d = devices.find((x) => x.id === id)!;
    d.lock = next;
    audit.unshift({ who: opts?.actor ?? "Азиз Каримов", act: next === "locked" ? "evLock" : "evUnlock", dev: d.name, t: 0 });
    return delay({ ...d });
  },

  async command(id: string, kind: "locate" | "sound"): Promise<void> {
    if (API_URL) { await fetchJson(`/api/devices/${id}/${kind}`, { method: "POST" }); return; }
    const d = devices.find((x) => x.id === id);
    if (kind === "locate" && d) audit.unshift({ who: "Азиз Каримов", act: "evLocate", dev: d.name, t: 0 });
    return delay(undefined);
  },
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-actor": "Азиз Каримов", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}
