import { Badge } from "@golden-one/ui";
import type { ApiAuditAction } from "./api/types.js";
import type { AuditEntry, Device } from "./types.js";
import type { makeT } from "./i18n.js";

type T = ReturnType<typeof makeT>;

export function loanBadge(s: Device["loan"], t: T) {
  if (s === "active") return <Badge tone="green">{t("stActive")}</Badge>;
  if (s === "overdue") return <Badge tone="red">{t("stOverdue")}</Badge>;
  if (s === "defaulted") return <Badge tone="red">{t("stDefaulted")}</Badge>;
  return <Badge tone="gray">{t("stPaid")}</Badge>;
}

export function mdmBadge(s: Device["mdm"], t: T) {
  if (s === "enrolled") return <Badge tone="steel">{t("stEnrolled")}</Badge>;
  if (s === "pending") return <Badge tone="amber">{t("stPending")}</Badge>;
  return <Badge tone="gray">{t("stReleased")}</Badge>;
}

/**
 * Amber for the pending states on purpose: the command has been sent but the
 * phone has not confirmed it. Showing those as "locked" would tell an operator
 * a customer has lost the use of their phone when they may not have.
 */
export function lockBadge(s: Device["lock"], t: T) {
  switch (s) {
    case "locked":
      return <Badge tone="red">{t("lkLocked")}</Badge>;
    case "lockPending":
      return <Badge tone="amber">{t("lkLockPending")}</Badge>;
    case "unlockPending":
      return <Badge tone="amber">{t("lkUnlockPending")}</Badge>;
    default:
      return <Badge tone="green">{t("lkUnlocked")}</Badge>;
  }
}

export function isPending(s: Device["lock"]): boolean {
  return s === "lockPending" || s === "unlockPending";
}

/** Relative time from an ISO timestamp, in the operator's language. */
export function fmtSince(iso: string | null | undefined, t: T): string {
  if (!iso) return t("never");
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("now");
  if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t("min")} ${t("ago")}`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} ${t("hr")} ${t("ago")}`;
  return new Date(iso).toISOString().slice(0, 10);
}

const ACTION_KEY = {
  LOGIN: "acLOGIN",
  LOCK: "acLOCK",
  UNLOCK: "acUNLOCK",
  LOCATE: "acLOCATE",
  SOUND: "acSOUND",
  ENROLL: "acENROLL",
  RELEASE: "acRELEASE",
  USER_CREATE: "acUSER_CREATE",
  USER_DISABLE: "acUSER_DISABLE",
} as const satisfies Record<ApiAuditAction, string>;

export function actionLabel(action: ApiAuditAction, t: T): string {
  return t(ACTION_KEY[action] as never);
}

const ACTION_STYLE: Record<ApiAuditAction, { color: string; icon: string }> = {
  LOGIN: { color: "--go-steel", icon: "settings" },
  LOCK: { color: "--go-red", icon: "lock" },
  UNLOCK: { color: "--go-green", icon: "unlock" },
  LOCATE: { color: "--go-amber", icon: "locate" },
  SOUND: { color: "--go-amber", icon: "sound" },
  ENROLL: { color: "--go-steel", icon: "enroll" },
  RELEASE: { color: "--go-green", icon: "check" },
  USER_CREATE: { color: "--go-steel", icon: "settings" },
  USER_DISABLE: { color: "--go-red", icon: "settings" },
};

export function actionStyle(action: ApiAuditAction) {
  return ACTION_STYLE[action];
}

/** Audit rows carry a deviceId, not a name — resolve it against loaded devices. */
export function deviceNameFor(entry: AuditEntry, devices: Device[]): string {
  if (!entry.deviceId) return "—";
  return devices.find((d) => d.id === entry.deviceId)?.name ?? "—";
}
