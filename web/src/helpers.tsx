import { Badge } from "@golden-one/ui";
import type { Device, AuditEntry } from "./types";
import type { makeT } from "./i18n";

type T = ReturnType<typeof makeT>;

export function loanBadge(s: Device["loan"], t: T) {
  if (s === "active") return <Badge tone="green">{t("stActive")}</Badge>;
  if (s === "overdue") return <Badge tone="red">{t("stOverdue")}</Badge>;
  return <Badge tone="gray">{t("stPaid")}</Badge>;
}
export function mdmBadge(s: Device["mdm"], t: T) {
  if (s === "enrolled") return <Badge tone="steel">{t("stEnrolled")}</Badge>;
  if (s === "pending") return <Badge tone="amber">{t("stPending")}</Badge>;
  return <Badge tone="gray">{t("stReleased")}</Badge>;
}
export function lockBadge(s: Device["lock"], t: T) {
  return s === "locked" ? <Badge tone="red">{t("lkLocked")}</Badge> : <Badge tone="green">{t("lkUnlocked")}</Badge>;
}

export function fmtAgo(sec: number, t: T) {
  if (sec < 60) return t("now");
  if (sec < 3600) return `${Math.floor(sec / 60)} ${t("min")} ${t("ago")}`;
  return `${Math.floor(sec / 3600)} ${t("hr")} ${t("ago")}`;
}

export const evColor: Record<AuditEntry["act"], string> = {
  evLock: "--go-red", evUnlock: "--go-green", evEnroll: "--go-steel", evLocate: "--go-amber",
};
export const evIcon: Record<AuditEntry["act"], "lock" | "unlock" | "enroll" | "locate"> = {
  evLock: "lock", evUnlock: "unlock", evEnroll: "enroll", evLocate: "locate",
};
