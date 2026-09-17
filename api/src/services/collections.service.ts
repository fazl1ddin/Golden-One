// The overdue policy — phase 2 of PLAN.md.
//
// Runs on a schedule and does three things in order: recompute how far behind
// each contract is, warn customers approaching the lock threshold, and — only
// when explicitly enabled — lock devices that have passed it.
//
// Auto-locking is off by default on purpose. Taking a customer's phone away is
// an action with legal weight under the loan agreement, and the product was
// specified around an operator making that call. Switching it on is a policy
// decision the operator of this system makes knowingly.

import { config } from "../config.js";
import { prisma } from "../db.js";
import { getNotifier } from "../notify/index.js";
import { recordAudit } from "./audit.service.js";
import { recomputeOverdue } from "./contract.service.js";
import { lockDevice, type ActorContext } from "./device.service.js";

/** Automatic actions are attributed to the system, never to a real operator. */
const SYSTEM_ACTOR: ActorContext = { id: "", name: "Система" };

const DAY_MS = 86_400_000;

export interface CollectionsRunResult {
  scanned: number;
  statusChanged: number;
  warned: number;
  warningsDelivered: number;
  locked: number;
  lockFailures: number;
  autoLockEnabled: boolean;
}

export async function runCollectionsPolicy(now = new Date()): Promise<CollectionsRunResult> {
  const { changed, scanned } = await recomputeOverdue(now);

  const overdue = await prisma.loanContract.findMany({
    where: { status: "OVERDUE" },
    include: { customer: true, devices: true },
  });

  const notifier = getNotifier();
  let warned = 0;
  let warningsDelivered = 0;
  let locked = 0;
  let lockFailures = 0;

  for (const contract of overdue) {
    /* ── Warn ────────────────────────────────────────────────────────────── */
    const dueForWarning =
      contract.daysOverdue >= config.WARN_AFTER_DAYS &&
      (!contract.lastWarningAt ||
        now.getTime() - contract.lastWarningAt.getTime() >= config.WARN_COOLDOWN_DAYS * DAY_MS);

    if (dueForWarning) {
      const result = await notifier.warnBeforeLock({
        to: contract.customer.phone,
        customerName: contract.customer.fullName,
        lang: "ru",
        daysOverdue: contract.daysOverdue,
        contractNumber: contract.number,
      });

      await prisma.loanContract.update({
        where: { id: contract.id },
        data: { lastWarningAt: now },
      });

      // Record what actually happened, including a non-delivery: "we warned
      // them" is a claim that has to survive a dispute.
      await recordAudit({
        actorName: SYSTEM_ACTOR.name,
        action: "WARNING",
        contractId: contract.id,
        reason: `Предупреждение о блокировке, просрочка ${contract.daysOverdue} дн.`,
        meta: {
          channel: notifier.channel,
          delivered: result.delivered,
          detail: result.detail ?? null,
          daysOverdue: contract.daysOverdue,
        },
      });

      warned += 1;
      if (result.delivered) warningsDelivered += 1;
    }

    /* ── Lock ────────────────────────────────────────────────────────────── */
    if (!config.AUTO_LOCK_ENABLED) continue;
    if (contract.daysOverdue < config.AUTO_LOCK_AFTER_DAYS) continue;

    for (const device of contract.devices) {
      if (device.lockStatus !== "UNLOCKED") continue;
      if (device.enrollmentStatus !== "ENROLLED") continue;

      try {
        await lockDevice(device.id, {
          actor: SYSTEM_ACTOR,
          reason: `Автоблокировка: просрочка ${contract.daysOverdue} дн.`,
          message:
            "Устройство заблокировано в связи с просрочкой платежа. " +
            "Для разблокировки обратитесь в Golden One.",
          phone: "+998 71 200-00-00",
          // Stable per device per day, so a scheduler that runs hourly cannot
          // queue the same lock over and over.
          idempotencyKey: `auto-lock:${device.id}:${now.toISOString().slice(0, 10)}`,
        });
        locked += 1;
      } catch {
        lockFailures += 1;
      }
    }
  }

  return {
    scanned,
    statusChanged: changed,
    warned,
    warningsDelivered,
    locked,
    lockFailures,
    autoLockEnabled: config.AUTO_LOCK_ENABLED,
  };
}
