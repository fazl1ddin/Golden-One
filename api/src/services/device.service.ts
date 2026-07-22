// Device service — core business logic for listing devices and running MDM
// commands. Route handlers stay thin; all orchestration lives here.

import type { CommandType, ContractStatus, LockStatus } from "../domain.js";
import { prisma } from "../db.js";
import { getDeviceManager, type CommandResult } from "../mdm/index.js";
import { recordAudit } from "./audit.service.js";
import { NotFoundError } from "./errors.js";

export interface DeviceListFilter {
  status?: ContractStatus;
  lock?: LockStatus;
}

export function listDevices(filter: DeviceListFilter) {
  return prisma.device.findMany({
    where: {
      ...(filter.lock ? { lockStatus: filter.lock } : {}),
      ...(filter.status ? { contract: { status: filter.status } } : {}),
    },
    include: {
      customer: true,
      contract: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getDeviceDetail(id: string) {
  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      customer: true,
      contract: true,
      commands: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!device) throw new NotFoundError(`Device ${id} not found`);

  const audit = await prisma.auditLog.findMany({
    where: { deviceId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { ...device, audit };
}

async function requireDevice(id: string) {
  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) throw new NotFoundError(`Device ${id} not found`);
  return device;
}

function persistCommand(
  deviceId: string,
  type: CommandType,
  result: CommandResult | { ok: boolean; status: string; message?: string },
  payload?: unknown,
) {
  const status =
    result.status === "ACKNOWLEDGED"
      ? "ACKNOWLEDGED"
      : result.status === "ERROR"
        ? "ERROR"
        : "PENDING";
  return prisma.mdmCommand.create({
    data: {
      deviceId,
      type,
      status,
      payload: payload === undefined ? null : JSON.stringify(payload),
    },
  });
}

export interface LockParams {
  actorName: string;
  reason?: string;
  message: string;
  phone: string;
}

export async function lockDevice(id: string, params: LockParams) {
  const device = await requireDevice(id);
  const mdm = getDeviceManager();

  const result = await mdm.lock(device.serial, {
    message: params.message,
    phone: params.phone,
  });

  const [, command] = await prisma.$transaction([
    prisma.device.update({
      where: { id },
      data: { lockStatus: "LOCKED" },
    }),
    persistCommand(id, "LOCK", result, {
      message: params.message,
      phone: params.phone,
      commandId: result.commandId,
    }),
  ]);

  await recordAudit({
    actorName: params.actorName,
    action: "LOCK",
    deviceId: id,
    contractId: device.contractId,
    reason: params.reason ?? null,
  });

  const updated = await getDeviceDetail(id);
  return { device: updated, command, result };
}

export interface UnlockParams {
  actorName: string;
  reason?: string;
}

export async function unlockDevice(id: string, params: UnlockParams) {
  const device = await requireDevice(id);
  const mdm = getDeviceManager();

  const result = await mdm.unlock(device.serial);

  const [, command] = await prisma.$transaction([
    prisma.device.update({
      where: { id },
      data: { lockStatus: "UNLOCKED" },
    }),
    persistCommand(id, "UNLOCK", result, { commandId: result.commandId }),
  ]);

  await recordAudit({
    actorName: params.actorName,
    action: "UNLOCK",
    deviceId: id,
    contractId: device.contractId,
    reason: params.reason ?? null,
  });

  const updated = await getDeviceDetail(id);
  return { device: updated, command, result };
}

export interface SimpleActionParams {
  actorName: string;
  reason?: string;
}

export async function locateDevice(id: string, params: SimpleActionParams) {
  const device = await requireDevice(id);
  const mdm = getDeviceManager();
  const result = await mdm.locate(device.serial);

  const command = await persistCommand(
    id,
    "LOCATE",
    { ok: result.ok, status: result.ok ? "ACKNOWLEDGED" : "ERROR" },
    result,
  );

  await recordAudit({
    actorName: params.actorName,
    action: "LOCATE",
    deviceId: id,
    contractId: device.contractId,
    reason: params.reason ?? null,
  });

  return { result, command };
}

export async function playSoundOnDevice(id: string, params: SimpleActionParams) {
  const device = await requireDevice(id);
  const mdm = getDeviceManager();
  const result = await mdm.playSound(device.serial);

  const command = await persistCommand(id, "SOUND", result, {
    commandId: result.commandId,
  });

  await recordAudit({
    actorName: params.actorName,
    action: "SOUND",
    deviceId: id,
    contractId: device.contractId,
    reason: params.reason ?? null,
  });

  return { result, command };
}

export async function getStats() {
  const [totalDevices, activeContracts, overdueContracts, lockedDevices] =
    await prisma.$transaction([
      prisma.device.count(),
      prisma.loanContract.count({ where: { status: "ACTIVE" } }),
      prisma.loanContract.count({ where: { status: "OVERDUE" } }),
      prisma.device.count({ where: { lockStatus: "LOCKED" } }),
    ]);

  return { totalDevices, activeContracts, overdueContracts, lockedDevices };
}
