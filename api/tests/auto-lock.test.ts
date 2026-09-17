// Auto-lock, with the policy deliberately switched on.
//
// It is off in every other suite; this file proves the capability exists and
// respects its threshold, so "disabled by default" is a choice rather than an
// unfinished feature.

import "./setup-autolock-env.js";

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { createApp, prisma, resetDatabase, seedDevice } from "./helpers.js";
import { runCollectionsPolicy } from "../src/services/collections.service.js";
import { reconcilePendingCommands } from "../src/services/device.service.js";
import { setNotifier } from "../src/notify/index.js";

let app: FastifyInstance;

before(async () => { app = await createApp(); });
after(async () => { await app.close(); await prisma.$disconnect(); });
beforeEach(async () => {
  await resetDatabase();
  setNotifier({ channel: "test", async warnBeforeLock() { return { delivered: true }; } });
});

async function deviceOverdue(days: number) {
  const device = await seedDevice();
  await prisma.loanContract.update({
    where: { id: device.contractId },
    data: {
      nextPaymentDate: new Date(Date.now() - days * 86_400_000),
      daysOverdue: days,
      status: "OVERDUE",
    },
  });
  return device;
}

describe("auto-lock (enabled)", () => {
  it("locks a device past the threshold and attributes it to the system", async () => {
    const device = await deviceOverdue(20);

    const result = await runCollectionsPolicy();
    assert.equal(result.autoLockEnabled, true);
    assert.equal(result.locked, 1);

    await reconcilePendingCommands();
    assert.equal(
      (await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).lockStatus,
      "LOCKED",
    );

    // The audit trail must never imply a person made this call.
    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "LOCK", deviceId: device.id },
    });
    assert.equal(entry.actorName, "Система");
    assert.equal(entry.actorId, null);
    assert.match(entry.reason ?? "", /Автоблокировка/);
  });

  it("leaves a device alone below the threshold", async () => {
    const device = await deviceOverdue(10);
    const result = await runCollectionsPolicy();
    assert.equal(result.locked, 0);
    assert.equal(
      (await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).lockStatus,
      "UNLOCKED",
    );
  });

  it("does not queue a second lock when the policy runs again the same day", async () => {
    const device = await deviceOverdue(20);
    await runCollectionsPolicy();
    await runCollectionsPolicy();

    // The idempotency key is stable per device per day, so an hourly scheduler
    // cannot send a customer's phone the same lock over and over.
    const locks = await prisma.mdmCommand.count({ where: { deviceId: device.id, type: "LOCK" } });
    assert.equal(locks, 1);
  });

  it("never auto-locks a released device", async () => {
    const device = await deviceOverdue(30);
    await prisma.device.update({
      where: { id: device.id },
      data: { enrollmentStatus: "RELEASED" },
    });

    const result = await runCollectionsPolicy();
    assert.equal(result.locked, 0);
  });
});
