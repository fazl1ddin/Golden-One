// Payments and the overdue policy — the half of the loop that ends a lock.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import {
  auth, createApp, createUser, LOCK_PAYLOAD, prisma, resetDatabase, seedDevice, tokenFor,
  type TestUser,
} from "./helpers.js";
import { reconcilePendingCommands } from "../src/services/device.service.js";
import { runCollectionsPolicy } from "../src/services/collections.service.js";
import { setNotifier } from "../src/notify/index.js";

let app: FastifyInstance;
let operator: TestUser;
let token: string;

before(async () => { app = await createApp(); });
after(async () => { await app.close(); await prisma.$disconnect(); });
beforeEach(async () => {
  await resetDatabase();
  setNotifier(null);
  operator = await createUser("COLLECTIONS");
  token = await tokenFor(app, operator);
});

async function overdueDevice(daysOverdue = 12) {
  const device = await seedDevice();
  const due = new Date(Date.now() - daysOverdue * 86_400_000);
  await prisma.loanContract.update({
    where: { id: device.contractId },
    data: { nextPaymentDate: due, daysOverdue, status: "OVERDUE" },
  });
  return device;
}

describe("payments", () => {
  it("records the money and moves the contract forward", async () => {
    const device = await overdueDevice();

    const res = await app.inject({
      method: "POST",
      url: `/api/contracts/${device.contractId}/payments`,
      headers: auth(token),
      payload: { amount: 980_000, method: "CASH", note: "Касса, филиал №2" },
    });
    assert.equal(res.statusCode, 201);

    const contract = await prisma.loanContract.findUniqueOrThrow({ where: { id: device.contractId } });
    assert.equal(contract.paid, 2_940_000 + 980_000);
    assert.equal(contract.status, "ACTIVE");
    assert.equal(contract.daysOverdue, 0);

    const payments = await prisma.payment.findMany({ where: { contractId: device.contractId } });
    assert.equal(payments.length, 1);
    assert.equal(payments[0]!.recordedById, operator.id);
  });

  it("writes the payment into the audit trail", async () => {
    const device = await overdueDevice();
    await app.inject({
      method: "POST",
      url: `/api/contracts/${device.contractId}/payments`,
      headers: auth(token),
      payload: { amount: 980_000 },
    });

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "PAYMENT" } });
    assert.equal(entry.actorId, operator.id);
    assert.equal(entry.contractId, device.contractId);
  });

  it("unlocks a locked device once the arrears are cleared", async () => {
    const device = await overdueDevice();

    await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: LOCK_PAYLOAD,
    });
    await reconcilePendingCommands();
    assert.equal(
      (await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).lockStatus,
      "LOCKED",
    );

    // Paying up must not require an operator to also remember to unlock:
    // leaving a paid-up customer without their phone is the worst outcome here.
    const res = await app.inject({
      method: "POST",
      url: `/api/contracts/${device.contractId}/payments`,
      headers: auth(token),
      payload: { amount: 980_000 },
    });
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.json().autoUnlockedDeviceIds, [device.id]);

    await reconcilePendingCommands();
    assert.equal(
      (await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).lockStatus,
      "UNLOCKED",
    );
  });

  it("does not unlock when a token payment leaves the contract overdue", async () => {
    const device = await overdueDevice();
    await app.inject({
      method: "POST", url: `/api/devices/${device.id}/lock`,
      headers: auth(token), payload: LOCK_PAYLOAD,
    });
    await reconcilePendingCommands();

    const res = await app.inject({
      method: "POST",
      url: `/api/contracts/${device.contractId}/payments`,
      headers: auth(token),
      payload: { amount: 1 },
    });
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.json().autoUnlockedDeviceIds, []);
    assert.equal(
      (await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).lockStatus,
      "LOCKED",
    );
  });

  it("rejects a zero or negative payment", async () => {
    const device = await overdueDevice();
    for (const amount of [0, -100]) {
      const res = await app.inject({
        method: "POST",
        url: `/api/contracts/${device.contractId}/payments`,
        headers: auth(token),
        payload: { amount },
      });
      assert.equal(res.statusCode, 400);
    }
  });

  it("is not available to a point-of-sale operator", async () => {
    const device = await overdueDevice();
    const pos = await createUser("POS_OPERATOR", { email: "pos-pay@test.local" });
    const posToken = await tokenFor(app, pos);

    const res = await app.inject({
      method: "POST",
      url: `/api/contracts/${device.contractId}/payments`,
      headers: auth(posToken),
      payload: { amount: 980_000 },
    });
    assert.equal(res.statusCode, 403);
  });
});

describe("overdue policy", () => {
  it("recomputes arrears from the due date", async () => {
    const device = await seedDevice();
    await prisma.loanContract.update({
      where: { id: device.contractId },
      data: {
        nextPaymentDate: new Date(Date.now() - 5 * 86_400_000),
        daysOverdue: 0,
        status: "ACTIVE",
      },
    });

    const result = await runCollectionsPolicy();
    assert.ok(result.statusChanged >= 1);

    const contract = await prisma.loanContract.findUniqueOrThrow({ where: { id: device.contractId } });
    assert.equal(contract.status, "OVERDUE");
    assert.equal(contract.daysOverdue, 5);
  });

  it("warns the customer and records whether it was actually delivered", async () => {
    const sent: string[] = [];
    setNotifier({
      channel: "test",
      async warnBeforeLock(notice) {
        sent.push(notice.to);
        return { delivered: true };
      },
    });

    await overdueDevice(10);
    const result = await runCollectionsPolicy();
    assert.equal(result.warned, 1);
    assert.equal(result.warningsDelivered, 1);
    assert.equal(sent.length, 1);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "WARNING" } });
    assert.equal((entry.meta as { channel: string }).channel, "test");
    assert.equal((entry.meta as { delivered: boolean }).delivered, true);
  });

  it("does not warn the same customer twice inside the cooldown", async () => {
    setNotifier({ channel: "test", async warnBeforeLock() { return { delivered: true }; } });
    await overdueDevice(10);

    assert.equal((await runCollectionsPolicy()).warned, 1);
    assert.equal((await runCollectionsPolicy()).warned, 0);
  });

  it("does NOT lock automatically by default", async () => {
    setNotifier({ channel: "test", async warnBeforeLock() { return { delivered: true }; } });
    // Well past the auto-lock threshold — and still untouched, because locking
    // a customer's phone without an operator is opt-in.
    const device = await overdueDevice(90);

    const result = await runCollectionsPolicy();
    assert.equal(result.autoLockEnabled, false);
    assert.equal(result.locked, 0);
    assert.equal(
      (await prisma.device.findUniqueOrThrow({ where: { id: device.id } })).lockStatus,
      "UNLOCKED",
    );
  });
});
