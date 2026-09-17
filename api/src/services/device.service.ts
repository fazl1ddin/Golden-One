// Device service — listing devices and driving MDM commands.
//
// The central rule: a device is only reported LOCKED once the MDM confirms the
// command reached the phone. Until then it is LOCK_PENDING. An operator looking
// at this dashboard is deciding whether a customer has actually lost the use of
// their phone, so "we sent it" and "it happened" must never look the same.

import type { Prisma } from "@prisma/client";
import type { CommandType, ContractStatus, LockStatus } from "../domain.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { getDeviceManager, MdmError, type CommandResult } from "../mdm/index.js";
import { recordAudit } from "./audit.service.js";
import { arrearsDue } from "./schedule.js";
import { AppError, NotFoundError } from "./errors.js";

export interface ActorContext {
  /** Empty for automated actions: those are attributed to no user row. */
  id: string;
  name: string;
  ip?: string;
  userAgent?: string;
}

export interface DeviceListQuery {
  status?: ContractStatus;
  lock?: LockStatus;
  search?: string;
  limit?: number;
  cursor?: string;
}

const deviceInclude = {
  customer: true,
  contract: true,
} satisfies Prisma.DeviceInclude;

/**
 * Attaches the figure an operator actually needs at the counter: what clears
 * the arrears. It is derived rather than stored so it cannot go stale between
 * the nightly recompute and the moment someone is standing there paying.
 */
export function withArrears<T extends { contract: Parameters<typeof arrearsDue>[0] }>(device: T) {
  return {
    ...device,
    contract: { ...device.contract, arrears: arrearsDue(device.contract) },
  };
}

export async function listDevices(query: DeviceListQuery = {}) {
  const limit = Math.min(query.limit ?? 50, 200);
  const search = query.search?.trim();

  const where: Prisma.DeviceWhereInput = {
    ...(query.lock ? { lockStatus: query.lock } : {}),
    ...(query.status ? { contract: { status: query.status } } : {}),
    ...(search
      ? {
          OR: [
            { imei: { contains: search, mode: "insensitive" } },
            { serial: { contains: search, mode: "insensitive" } },
            { customer: { fullName: { contains: search, mode: "insensitive" } } },
            { customer: { phone: { contains: search } } },
            { contract: { number: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const items = await prisma.device.findMany({
    where,
    include: deviceInclude,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return {
    items: page.map(withArrears),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export async function getDeviceDetail(id: string) {
  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      ...deviceInclude,
      commands: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!device) throw new NotFoundError(`Device ${id} not found`);

  const audit = await prisma.auditLog.findMany({
    where: { deviceId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { ...withArrears(device), audit };
}

async function requireDevice(id: string) {
  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) throw new NotFoundError(`Device ${id} not found`);
  return device;
}

/** Where a device lands once a command of this type is confirmed applied. */
const SETTLED_LOCK_STATE: Partial<Record<CommandType, LockStatus>> = {
  LOCK: "LOCKED",
  UNLOCK: "UNLOCKED",
};

/** Where a device sits while the command is still in flight. */
const PENDING_LOCK_STATE: Partial<Record<CommandType, LockStatus>> = {
  LOCK: "LOCK_PENDING",
  UNLOCK: "UNLOCK_PENDING",
};

/** What the device reverts to when a command definitively fails. */
const FAILED_LOCK_STATE: Partial<Record<CommandType, LockStatus>> = {
  LOCK: "UNLOCKED",
  UNLOCK: "LOCKED",
};

interface RunCommandParams {
  deviceId: string;
  type: CommandType;
  actor: ActorContext;
  reason?: string;
  payload?: Prisma.InputJsonValue;
  idempotencyKey?: string;
  send: (serial: string) => Promise<CommandResult>;
}

/**
 * Issues one MDM command and records it. Returns the persisted command so the
 * caller can show the operator its real state (queued vs applied).
 */
async function runCommand(params: RunCommandParams) {
  const device = await requireDevice(params.deviceId);
  const mdm = getDeviceManager();

  // An idempotency key makes a retried request (flaky network, double click)
  // re-use the original command instead of sending a second lock to the phone.
  if (params.idempotencyKey) {
    const existing = await prisma.mdmCommand.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      if (existing.deviceId !== params.deviceId || existing.type !== params.type) {
        throw new AppError(
          "This Idempotency-Key was already used for a different command",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      }
      return {
        command: existing,
        device: await getDeviceDetail(params.deviceId),
        replayed: true,
      };
    }
  }

  const command = await prisma.mdmCommand.create({
    data: {
      deviceId: device.id,
      type: params.type,
      status: "PENDING",
      provider: mdm.provider,
      ...(params.payload === undefined ? {} : { payload: params.payload }),
      idempotencyKey: params.idempotencyKey ?? null,
      requestedById: params.actor.id || null,
      attempts: 1,
      lastTriedAt: new Date(),
    },
  });

  const pendingState = PENDING_LOCK_STATE[params.type];
  if (pendingState) {
    await prisma.device.update({
      where: { id: device.id },
      data: { lockStatus: pendingState },
    });
  }

  // The audit entry is written before the outcome is known: the operator's
  // *decision* is the auditable event, whether or not the phone was reachable.
  await recordAudit({
    actorId: params.actor.id || null,
    actorName: params.actor.name,
    action: params.type === "REMOVE_MGMT" ? "RELEASE" : params.type,
    deviceId: device.id,
    contractId: device.contractId,
    reason: params.reason ?? null,
    ip: params.actor.ip,
    userAgent: params.actor.userAgent,
  });

  let result: CommandResult;
  try {
    result = await params.send(device.serial);
  } catch (err) {
    const message = err instanceof MdmError ? err.message : String(err);
    await prisma.$transaction([
      prisma.mdmCommand.update({
        where: { id: command.id },
        data: { status: "ERROR", error: message, settledAt: new Date() },
      }),
      ...(pendingState
        ? [
            prisma.device.update({
              where: { id: device.id },
              data: { lockStatus: FAILED_LOCK_STATE[params.type]! },
            }),
          ]
        : []),
    ]);
    throw err;
  }

  const settled = result.status === "ACKNOWLEDGED";
  const failed = result.status === "ERROR";

  const updatedCommand = await prisma.mdmCommand.update({
    where: { id: command.id },
    data: {
      status: result.status,
      providerCommandId: result.commandId ?? null,
      error: failed ? (result.message ?? "Command rejected by MDM") : null,
      settledAt: settled || failed ? new Date() : null,
    },
  });

  const nextLockState = settled
    ? SETTLED_LOCK_STATE[params.type]
    : failed
      ? FAILED_LOCK_STATE[params.type]
      : undefined;

  if (nextLockState) {
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lockStatus: nextLockState,
        ...(settled ? { lastSeenAt: new Date() } : {}),
      },
    });
  }

  return {
    command: updatedCommand,
    device: await getDeviceDetail(device.id),
    result,
    replayed: false,
  };
}

export interface LockParams {
  actor: ActorContext;
  reason?: string;
  message: string;
  phone: string;
  idempotencyKey?: string;
}

export async function lockDevice(id: string, params: LockParams) {
  const device = await requireDevice(id);
  if (device.enrollmentStatus !== "ENROLLED") {
    throw new AppError(
      `Device is ${device.enrollmentStatus}; only an enrolled, supervised device can be locked`,
      409,
      "NOT_ENROLLED",
    );
  }
  if (device.lockStatus === "LOCKED") {
    throw new AppError("Device is already locked", 409, "ALREADY_LOCKED");
  }

  const mdm = getDeviceManager();
  return runCommand({
    deviceId: id,
    type: "LOCK",
    actor: params.actor,
    reason: params.reason,
    payload: { message: params.message, phone: params.phone },
    idempotencyKey: params.idempotencyKey,
    send: (serial) =>
      mdm.lock(serial, { message: params.message, phone: params.phone }),
  });
}

export interface UnlockParams {
  actor: ActorContext;
  reason?: string;
  idempotencyKey?: string;
}

export async function unlockDevice(id: string, params: UnlockParams) {
  const device = await requireDevice(id);
  if (device.lockStatus === "UNLOCKED") {
    throw new AppError("Device is already unlocked", 409, "ALREADY_UNLOCKED");
  }

  const mdm = getDeviceManager();
  return runCommand({
    deviceId: id,
    type: "UNLOCK",
    actor: params.actor,
    reason: params.reason,
    idempotencyKey: params.idempotencyKey,
    send: (serial) => mdm.unlock(serial),
  });
}

export interface SimpleActionParams {
  actor: ActorContext;
  reason?: string;
}

export async function locateDevice(id: string, params: SimpleActionParams) {
  const device = await requireDevice(id);
  const mdm = getDeviceManager();

  const point = await mdm.locate(device.serial);

  const command = await prisma.mdmCommand.create({
    data: {
      deviceId: id,
      type: "LOCATE",
      status: point.ok ? "ACKNOWLEDGED" : "ERROR",
      provider: mdm.provider,
      payload: point as unknown as Prisma.InputJsonValue,
      error: point.ok ? null : (point.message ?? "Location unavailable"),
      requestedById: params.actor.id || null,
      attempts: 1,
      lastTriedAt: new Date(),
      settledAt: new Date(),
    },
  });

  if (point.ok) {
    await prisma.device.update({ where: { id }, data: { lastSeenAt: new Date() } });
  }

  await recordAudit({
    actorId: params.actor.id || null,
    actorName: params.actor.name,
    action: "LOCATE",
    deviceId: id,
    contractId: device.contractId,
    reason: params.reason ?? null,
    ip: params.actor.ip,
    userAgent: params.actor.userAgent,
  });

  return { result: point, command };
}

export async function playSoundOnDevice(id: string, params: SimpleActionParams) {
  const mdm = getDeviceManager();
  return runCommand({
    deviceId: id,
    type: "SOUND",
    actor: params.actor,
    reason: params.reason,
    send: (serial) => mdm.playSound(serial),
  });
}

/**
 * Releases a fully repaid device: management is removed so the customer is left
 * with an unmanaged phone. Admin-only, and blocked while money is still owed.
 */
export async function releaseDevice(id: string, params: SimpleActionParams) {
  const device = await prisma.device.findUnique({
    where: { id },
    include: { contract: true },
  });
  if (!device) throw new NotFoundError(`Device ${id} not found`);

  if (device.contract.status !== "PAID") {
    throw new AppError(
      "Management can only be removed once the contract is fully paid",
      409,
      "CONTRACT_NOT_PAID",
    );
  }

  const mdm = getDeviceManager();
  const outcome = await runCommand({
    deviceId: id,
    type: "REMOVE_MGMT",
    actor: params.actor,
    reason: params.reason,
    send: (serial) => mdm.removeManagement(serial),
  });

  await prisma.device.update({
    where: { id },
    data: { enrollmentStatus: "RELEASED", lockStatus: "UNLOCKED" },
  });

  return outcome;
}

export async function getStats() {
  const [
    totalDevices,
    supervised,
    activeContracts,
    overdueContracts,
    lockedDevices,
    pendingCommands,
  ] = await prisma.$transaction([
    prisma.device.count(),
    prisma.device.count({ where: { enrollmentStatus: "ENROLLED" } }),
    prisma.loanContract.count({ where: { status: "ACTIVE" } }),
    prisma.loanContract.count({ where: { status: "OVERDUE" } }),
    prisma.device.count({ where: { lockStatus: "LOCKED" } }),
    prisma.mdmCommand.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalDevices,
    supervised,
    activeContracts,
    overdueContracts,
    lockedDevices,
    pendingCommands,
  };
}

/**
 * Asks the MDM what actually happened to commands still in flight and moves
 * devices to their real state. Runs on a timer and is also exposed to admins,
 * because "why does this still say pending?" needs an answer an operator can
 * trigger themselves.
 */
export async function reconcilePendingCommands(limit = 50) {
  const mdm = getDeviceManager();
  const pending = await prisma.mdmCommand.findMany({
    where: { status: "PENDING", providerCommandId: { not: null } },
    include: { device: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let settled = 0;
  let failed = 0;
  let stillPending = 0;

  for (const command of pending) {
    let result: CommandResult;
    try {
      result = await mdm.getCommandStatus(
        command.device.serial,
        command.providerCommandId!,
      );
    } catch {
      // A transient MDM outage must never flip a device's reported state.
      stillPending += 1;
      continue;
    }

    const attempts = command.attempts + 1;
    const exhausted = attempts >= config.COMMAND_MAX_ATTEMPTS;
    const type = command.type as CommandType;

    if (result.status === "ACKNOWLEDGED") {
      const next = SETTLED_LOCK_STATE[type];
      await prisma.$transaction([
        prisma.mdmCommand.update({
          where: { id: command.id },
          data: {
            status: "ACKNOWLEDGED",
            attempts,
            lastTriedAt: new Date(),
            settledAt: new Date(),
          },
        }),
        ...(next
          ? [
              prisma.device.update({
                where: { id: command.deviceId },
                data: { lockStatus: next, lastSeenAt: new Date() },
              }),
            ]
          : []),
      ]);
      settled += 1;
      continue;
    }

    if (result.status === "ERROR" || exhausted) {
      const next = FAILED_LOCK_STATE[type];
      await prisma.$transaction([
        prisma.mdmCommand.update({
          where: { id: command.id },
          data: {
            status: "ERROR",
            attempts,
            lastTriedAt: new Date(),
            settledAt: new Date(),
            error:
              result.message ??
              (exhausted
                ? "Device did not apply the command in time"
                : "Command failed"),
          },
        }),
        ...(next
          ? [
              prisma.device.update({
                where: { id: command.deviceId },
                data: { lockStatus: next },
              }),
            ]
          : []),
      ]);
      failed += 1;
      continue;
    }

    await prisma.mdmCommand.update({
      where: { id: command.id },
      data: { attempts, lastTriedAt: new Date() },
    });
    stillPending += 1;
  }

  return { checked: pending.length, settled, failed, stillPending };
}
