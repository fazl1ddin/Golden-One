// The audit trail is a compliance artefact: it has to be complete and it has
// to be impossible to rewrite.

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
} from "./helpers.js";

let app: FastifyInstance;

before(async () => {
  app = await createApp();
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});
beforeEach(resetDatabase);

describe("audit trail", () => {
  it("cannot be modified, even directly in the database", async () => {
    const user = await createUser("COLLECTIONS");
    const token = await tokenFor(app, user);
    const device = await seedDevice();

    await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: { ...LOCK_PAYLOAD, reason: "Просрочка" },
    });

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { deviceId: device.id, action: "LOCK" },
    });

    // Someone with database access still cannot rewrite why a phone was locked.
    await assert.rejects(
      () =>
        prisma.auditLog.update({
          where: { id: entry.id },
          data: { reason: "Совсем другая причина" },
        }),
      /append-only/i,
    );

    await assert.rejects(
      () => prisma.auditLog.delete({ where: { id: entry.id } }),
      /append-only/i,
    );

    const unchanged = await prisma.auditLog.findUniqueOrThrow({ where: { id: entry.id } });
    assert.equal(unchanged.reason, "Просрочка");
  });

  it("records a login", async () => {
    const user = await createUser("COLLECTIONS");
    await tokenFor(app, user);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "LOGIN" } });
    assert.equal(entry.actorId, user.id);
  });

  it("keeps the actor's name even after the account is renamed", async () => {
    const user = await createUser("COLLECTIONS", { name: "Азиз Каримов" });
    const token = await tokenFor(app, user);
    const device = await seedDevice();

    await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: LOCK_PAYLOAD,
    });

    await prisma.user.update({ where: { id: user.id }, data: { name: "Кто-то другой" } });

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "LOCK" } });
    assert.equal(entry.actorName, "Азиз Каримов");
  });

  it("is not readable by a point-of-sale operator", async () => {
    const pos = await createUser("POS_OPERATOR");
    const token = await tokenFor(app, pos);
    const res = await app.inject({
      method: "GET",
      url: "/api/audit",
      headers: auth(token),
    });
    assert.equal(res.statusCode, 403);
  });

  it("paginates newest-first", async () => {
    const user = await createUser("COLLECTIONS");
    const token = await tokenFor(app, user);
    const device = await seedDevice();

    for (let i = 0; i < 3; i += 1) {
      await app.inject({
        method: "POST",
        url: `/api/devices/${device.id}/locate`,
        headers: auth(token),
        payload: { reason: `Проверка ${i}` },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/api/audit?limit=2",
      headers: auth(token),
    });
    const body = res.json();
    assert.equal(body.items.length, 2);
    assert.ok(body.nextCursor);
    assert.ok(
      new Date(body.items[0].createdAt) >= new Date(body.items[1].createdAt),
      "audit entries should be newest-first",
    );
  });
});
