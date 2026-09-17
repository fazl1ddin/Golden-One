// Contract service — payments and the overdue position they determine.

import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { recordAudit } from "./audit.service.js";
import { AppError, NotFoundError } from "./errors.js";
import { applyPayment, recompute, type ContractState } from "./schedule.js";
import { unlockDevice, type ActorContext } from "./device.service.js";

type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "OTHER";

function toState(contract: {
  amount: number;
  monthly: number;
  paid: number;
  nextPaymentDate: Date | null;
  status: string;
}): ContractState {
  return {
    amount: contract.amount,
    monthly: contract.monthly,
    paid: contract.paid,
    nextPaymentDate: contract.nextPaymentDate,
    status: contract.status as ContractState["status"],
  };
}

export interface RecordPaymentInput {
  amount: number;
  method?: PaymentMethod;
  note?: string;
  actor: ActorContext;
}

/**
 * Records money received and moves the contract to its new position.
 *
 * If this clears the arrears on a locked device, the device is unlocked without
 * waiting for anyone to press a button. Leaving a paid-up customer locked out of
 * their phone is the worst failure this product can have, so the automatic
 * action is deliberately the permissive one.
 */
export async function recordPayment(contractId: string, input: RecordPaymentInput) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new AppError("Payment amount must be a positive whole number", 400, "BAD_AMOUNT");
  }

  const contract = await prisma.loanContract.findUnique({
    where: { id: contractId },
    include: { devices: true, customer: true },
  });
  if (!contract) throw new NotFoundError(`Contract ${contractId} not found`);
  if (contract.status === "PAID") {
    throw new AppError("This contract is already fully paid", 409, "ALREADY_PAID");
  }

  const next = applyPayment(toState(contract), input.amount);

  const [payment, updated] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        contractId,
        amount: input.amount,
        method: input.method ?? "CASH",
        note: input.note ?? null,
        recordedById: input.actor.id || null,
      },
    }),
    prisma.loanContract.update({
      where: { id: contractId },
      data: {
        paid: next.paid,
        nextPaymentDate: next.nextPaymentDate,
        daysOverdue: next.daysOverdue,
        status: next.status,
        // A customer who has just paid should be warned afresh next time, not
        // treated as already-warned from the previous cycle.
        ...(next.status !== "OVERDUE" ? { lastWarningAt: null } : {}),
      },
    }),
  ]);

  await recordAudit({
    actorId: input.actor.id || null,
    actorName: input.actor.name,
    action: "PAYMENT",
    contractId,
    reason: input.note ?? null,
    ip: input.actor.ip,
    userAgent: input.actor.userAgent,
    meta: {
      amount: input.amount,
      method: input.method ?? "CASH",
      paidTotal: next.paid,
      status: next.status,
    } satisfies Prisma.InputJsonValue,
  });

  const unlocked: string[] = [];
  if (next.status !== "OVERDUE") {
    for (const device of contract.devices) {
      if (device.lockStatus === "LOCKED" || device.lockStatus === "LOCK_PENDING") {
        try {
          await unlockDevice(device.id, {
            actor: input.actor,
            reason: `Оплата получена: ${input.amount}`,
          });
          unlocked.push(device.id);
        } catch (err) {
          // A failed unlock must not roll back a recorded payment — the money
          // arrived either way. Surface it instead of losing it.
          await recordAudit({
            actorId: input.actor.id || null,
            actorName: input.actor.name,
            action: "UNLOCK",
            deviceId: device.id,
            contractId,
            reason: `Автоматическая разблокировка после оплаты не удалась: ${
              err instanceof Error ? err.message : String(err)
            }`,
          });
        }
      }
    }
  }

  return { payment, contract: updated, autoUnlockedDeviceIds: unlocked };
}

export async function listPayments(contractId: string) {
  const contract = await prisma.loanContract.findUnique({ where: { id: contractId } });
  if (!contract) throw new NotFoundError(`Contract ${contractId} not found`);

  return prisma.payment.findMany({
    where: { contractId },
    orderBy: { createdAt: "desc" },
    include: { recordedBy: { select: { id: true, name: true } } },
  });
}

/**
 * Recomputes every open contract's arrears from its due date.
 *
 * Without this, `daysOverdue` is only ever whatever it was when the row was
 * written — the collections queue would quietly drift away from reality.
 */
export async function recomputeOverdue(now = new Date()) {
  const contracts = await prisma.loanContract.findMany({
    where: { status: { in: ["ACTIVE", "OVERDUE"] } },
    select: {
      id: true,
      amount: true,
      monthly: true,
      paid: true,
      nextPaymentDate: true,
      status: true,
      daysOverdue: true,
    },
  });

  let changed = 0;
  for (const contract of contracts) {
    const next = recompute(toState(contract), now);
    if (next.daysOverdue === contract.daysOverdue && next.status === contract.status) continue;

    await prisma.loanContract.update({
      where: { id: contract.id },
      data: {
        daysOverdue: next.daysOverdue,
        status: next.status,
        nextPaymentDate: next.nextPaymentDate,
      },
    });
    changed += 1;
  }

  return { scanned: contracts.length, changed };
}
