// Device command behaviour — the product's most consequential path.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import {
  auth,
  createApp,
  createUser,
  LOCK_PAYLOAD,
  prisma,
  resetDatabase,
  seedDevice,
  tokenFor,
  type TestUser,
} from "./helpers.js";
import { reconcilePendingCommands } from "../src/services/device.service.js";

let app: FastifyInstance;
let operator: TestUser;
let token: string;

before(async () => {
  app = await createApp();
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetDatabase();
  operator = await createUser("COLLECTIONS");
  token = await tokenFor(app, operator);
});

describe("locking", () => {
  it("does not report a device as locked until the MDM confirms it", async () => {
    const device = await seedDevice();

    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: LOCK_PAYLOAD,
    });
    assert.equal(res.statusCode, 200);

    // The mock MDM queues the command, as real Apple MDM does. Until the phone
    // checks in, the honest answer is "pending", not "locked" — an operator
    // must not tell a customer their phone is locked when it may not be.
    const stored = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    assert.equal(stored.lockStatus, "LOCK_PENDING");

    const command = await prisma.mdmCommand.findFirstOrThrow({
      where: { deviceId: device.id },
    });
    assert.equal(command.status, "PENDING");
    assert.equal(command.type, "LOCK");
  });

  it("moves the device to LOCKED once reconciliation confirms delivery", async () => {
    const device = await seedDevice();
    await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: LOCK_PAYLOAD,
    });

    const result = await reconcilePendingCommands();
    assert.equal(result.settled, 1);

    const stored = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    assert.equal(stored.lockStatus, "LOCKED");
  });

  it("records who ordered the lock, and why", async () => {
    const device = await seedDevice();
    await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: { ...LOCK_PAYLOAD, reason: "Просрочка 24 дня" },
    });

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { deviceId: device.id, action: "LOCK" },
    });
    assert.equal(entry.actorId, operator.id);
    assert.equal(entry.reason, "Просрочка 24 дня");
    assert.ok(entry.ip, "the audit entry should record where the action came from");
  });

  it("refuses to lock a device that is already locked", async () => {
    const device = await seedDevice({ lockStatus: "LOCKED" });
    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: LOCK_PAYLOAD,
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error, "ALREADY_LOCKED");
  });

  it("refuses to lock a device that is no longer enrolled", async () => {
    const device = await seedDevice();
    await prisma.device.update({
      where: { id: device.id },
      data: { enrollmentStatus: "RELEASED" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: LOCK_PAYLOAD,
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error, "NOT_ENROLLED");
  });

  it("requires an explicit lock message and contact phone", async () => {
    const device = await seedDevice();
    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: {},
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, "VALIDATION_ERROR");
  });

  it("sends only one command when the same request is retried", async () => {
    const device = await seedDevice();
    const headers = { ...auth(token), "idempotency-key": "retry-key-1" };

    const first = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers,
      payload: LOCK_PAYLOAD,
    });
    const second = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers,
      payload: LOCK_PAYLOAD,
    });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(second.json().replayed, true);

    // One customer-visible lock, not two.
    assert.equal(await prisma.mdmCommand.count({ where: { deviceId: device.id } }), 1);
  });
});

describe("unlocking", () => {
  it("unlocks a locked device and settles on reconciliation", async () => {
    const device = await seedDevice({ lockStatus: "LOCKED" });

    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/unlock`,
      headers: auth(token),
      payload: { reason: "Оплата получена" },
    });
    assert.equal(res.statusCode, 200);

    const pending = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    assert.equal(pending.lockStatus, "UNLOCK_PENDING");

    await reconcilePendingCommands();
    const settled = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    assert.equal(settled.lockStatus, "UNLOCKED");
  });

  it("refuses to unlock a device that is already unlocked", async () => {
    const device = await seedDevice();
    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/unlock`,
      headers: auth(token),
      payload: {},
    });
    assert.equal(res.statusCode, 409);
  });
});

describe("release", () => {
  it("refuses to remove management while the contract is unpaid", async () => {
    const admin = await createUser("ADMIN", { email: "admin2@test.local" });
    const adminToken = await tokenFor(app, admin);
    const device = await seedDevice({ contractStatus: "OVERDUE" });

    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/release`,
      headers: auth(adminToken),
      payload: {},
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error, "CONTRACT_NOT_PAID");
  });

  it("releases a device once the contract is paid", async () => {
    const admin = await createUser("ADMIN", { email: "admin3@test.local" });
    const adminToken = await tokenFor(app, admin);
    const device = await seedDevice({ contractStatus: "PAID" });

    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/release`,
      headers: auth(adminToken),
      payload: {},
    });
    assert.equal(res.statusCode, 200);

    const stored = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    assert.equal(stored.enrollmentStatus, "RELEASED");
  });
});

describe("listing", () => {
  it("paginates with a cursor", async () => {
    for (let i = 0; i < 3; i += 1) await seedDevice();

    const firstPage = await app.inject({
      method: "GET",
      url: "/api/devices?limit=2",
      headers: auth(token),
    });
    const body = firstPage.json();
    assert.equal(body.items.length, 2);
    assert.ok(body.nextCursor);

    const secondPage = await app.inject({
      method: "GET",
      url: `/api/devices?limit=2&cursor=${body.nextCursor}`,
      headers: auth(token),
    });
    assert.equal(secondPage.json().items.length, 1);
  });

  it("finds a device by IMEI", async () => {
    const device = await seedDevice();
    const res = await app.inject({
      method: "GET",
      url: `/api/devices?search=${device.imei}`,
      headers: auth(token),
    });
    assert.equal(res.json().items.length, 1);
    assert.equal(res.json().items[0].id, device.id);
  });
});
