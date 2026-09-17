// Customer notifications.
//
// Deliberately an interface with a logging implementation: no SMS provider is
// wired up, and pretending otherwise would be worse than being explicit. A
// warning that was never delivered must not look delivered in the audit trail,
// so every notice records whether it actually went anywhere.

export interface Notice {
  to: string;
  customerName: string;
  /** Preferred language of the recipient, not of the operator. */
  lang: "ru" | "uz";
  daysOverdue: number;
  contractNumber: string;
}

export interface Notifier {
  readonly channel: string;
  warnBeforeLock(notice: Notice): Promise<{ delivered: boolean; detail?: string }>;
}

const TEXT = {
  ru: (n: Notice) =>
    `Golden One: по договору ${n.contractNumber} просрочка ${n.daysOverdue} дн. ` +
    `Во избежание блокировки устройства погасите задолженность. Тел.: +998 71 200-00-00`,
  uz: (n: Notice) =>
    `Golden One: ${n.contractNumber} shartnomasi bo‘yicha ${n.daysOverdue} kun kechikish. ` +
    `Qurilma bloklanmasligi uchun qarzni to‘lang. Tel.: +998 71 200-00-00`,
};

export function renderWarning(notice: Notice): string {
  return TEXT[notice.lang](notice);
}

/**
 * Writes the message it *would* send to the log. This is the default so a
 * deployment without an SMS contract still runs the full overdue flow, with the
 * gap visible rather than silent.
 */
export class LogNotifier implements Notifier {
  readonly channel = "log";

  async warnBeforeLock(notice: Notice): Promise<{ delivered: boolean; detail?: string }> {
    console.log(`[notify:log] -> ${notice.to}: ${renderWarning(notice)}`);
    return { delivered: false, detail: "no delivery channel configured (log only)" };
  }
}

let cached: Notifier | null = null;

export function getNotifier(): Notifier {
  if (!cached) cached = new LogNotifier();
  return cached;
}

/** Test seam. */
export function setNotifier(notifier: Notifier | null): void {
  cached = notifier;
}
