// Rate limiting, verified for real.
//
// node:test runs each file in its own process, so this file can set tight
// ceilings before the config module is loaded without affecting other suites.

// Must be imported before ./helpers.js so the tight ceilings are in place
// before src/config.ts is evaluated.
import "./setup-ratelimit-env.js";

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

describe("rate limiting", () => {
  // Declaration order matters: the login-guessing test below deliberately
  // exhausts the per-IP login budget, so any test that needs to sign in has to
  // run before it.
  it("caps how fast device commands can be fired", async () => {
    const user = await createUser("COLLECTIONS", { email: "op-rl@test.local" });
    const token = await tokenFor(app, user);

    const codes: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const device = await seedDevice();
      const res = await app.inject({
        method: "POST",
        url: `/api/devices/${device.id}/lock`,
        headers: auth(token),
        payload: LOCK_PAYLOAD,
      });
      codes.push(res.statusCode);
    }

    assert.ok(
      codes.includes(429),
      `expected the command budget to kick in, got ${codes.join(",")}`,
    );
  });

  it("stops repeated password guessing against one account", async () => {
    await createUser("COLLECTIONS", { email: "target@test.local" });

    const attempt = () =>
      app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "target@test.local", password: "wrong-password-here" },
      });

    const codes: number[] = [];
    for (let i = 0; i < 8; i += 1) codes.push((await attempt()).statusCode);

    assert.ok(
      codes.includes(429),
      `expected a 429 once the login budget is spent, got ${codes.join(",")}`,
    );
  });
});
