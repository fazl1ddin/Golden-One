// Authentication and role enforcement.
//
// The question every test here answers: can someone who should not be able to
// lock a customer's phone do it anyway?

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

describe("authentication", () => {
  it("rejects an unauthenticated request to a protected route", async () => {
    const res = await app.inject({ method: "GET", url: "/api/devices" });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error, "UNAUTHORIZED");
  });

  it("rejects a garbage bearer token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/devices",
      headers: auth("not-a-real-token"),
    });
    assert.equal(res.statusCode, 401);
  });

  it("issues a token for valid credentials and identifies the user", async () => {
    const user = await createUser("COLLECTIONS");
    const token = await tokenFor(app, user);

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: auth(token),
    });
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().user.email, user.email);
    assert.equal(me.json().user.role, "COLLECTIONS");
  });

  it("gives the same answer for a wrong password and an unknown account", async () => {
    await createUser("COLLECTIONS", { email: "real@test.local" });

    const wrongPassword = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "real@test.local", password: "definitely-wrong-pass" },
    });
    const unknownUser = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "ghost@test.local", password: "definitely-wrong-pass" },
    });

    assert.equal(wrongPassword.statusCode, 401);
    assert.equal(unknownUser.statusCode, 401);
    // Identical bodies: the API must not reveal which emails are registered.
    assert.deepEqual(
      { ...wrongPassword.json(), requestId: undefined },
      { ...unknownUser.json(), requestId: undefined },
    );
  });

  it("refuses to log in a deactivated account", async () => {
    const user = await createUser("COLLECTIONS", { active: false });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: user.email, password: user.password },
    });
    assert.equal(res.statusCode, 401);
  });

  it("invalidates tokens already issued when the account is deactivated", async () => {
    const admin = await createUser("ADMIN", { email: "admin@test.local" });
    const operator = await createUser("COLLECTIONS", { email: "op@test.local" });

    const adminToken = await tokenFor(app, admin);
    const operatorToken = await tokenFor(app, operator);

    // The operator's token works right now...
    const before = await app.inject({
      method: "GET",
      url: "/api/devices",
      headers: auth(operatorToken),
    });
    assert.equal(before.statusCode, 200);

    await app.inject({
      method: "PATCH",
      url: `/api/users/${operator.id}/active`,
      headers: auth(adminToken),
      payload: { active: false },
    });

    // ...and stops working immediately, without waiting for expiry. A
    // dismissed operator must lose the ability to lock phones at once.
    const afterDeactivation = await app.inject({
      method: "GET",
      url: "/api/devices",
      headers: auth(operatorToken),
    });
    assert.equal(afterDeactivation.statusCode, 401);
  });

  it("signs other sessions out when the password changes", async () => {
    const user = await createUser("COLLECTIONS");
    const oldToken = await tokenFor(app, user);

    const changed = await app.inject({
      method: "POST",
      url: "/api/auth/password",
      headers: auth(oldToken),
      payload: { currentPassword: user.password, newPassword: "a-new-longer-password" },
    });
    assert.equal(changed.statusCode, 200);

    const reused = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: auth(oldToken),
    });
    assert.equal(reused.statusCode, 401);
  });
});

describe("role permissions", () => {
  it("does not let a point-of-sale operator lock a device", async () => {
    const pos = await createUser("POS_OPERATOR");
    const token = await tokenFor(app, pos);
    const device = await seedDevice();

    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: LOCK_PAYLOAD,
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error, "FORBIDDEN");

    // And the device really did not move.
    const after = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    assert.equal(after.lockStatus, "UNLOCKED");
    assert.equal(await prisma.mdmCommand.count(), 0);
  });

  it("lets a collections operator lock a device", async () => {
    const collections = await createUser("COLLECTIONS");
    const token = await tokenFor(app, collections);
    const device = await seedDevice();

    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/lock`,
      headers: auth(token),
      payload: LOCK_PAYLOAD,
    });
    assert.equal(res.statusCode, 200);
  });

  it("does not let a collections operator manage users", async () => {
    const collections = await createUser("COLLECTIONS");
    const token = await tokenFor(app, collections);

    const res = await app.inject({
      method: "GET",
      url: "/api/users",
      headers: auth(token),
    });
    assert.equal(res.statusCode, 403);
  });

  it("does not let a collections operator release a device", async () => {
    const collections = await createUser("COLLECTIONS");
    const token = await tokenFor(app, collections);
    const device = await seedDevice({ contractStatus: "PAID" });

    const res = await app.inject({
      method: "POST",
      url: `/api/devices/${device.id}/release`,
      headers: auth(token),
      payload: {},
    });
    assert.equal(res.statusCode, 403);
  });
});
