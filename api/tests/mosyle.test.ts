// MosyleAdapter, driven by a stubbed fetch.
//
// The endpoint paths are unverified against Mosyle's portal docs, so these tests
// deliberately pin the things that do not depend on them: that two separate
// credentials are used correctly, that an expired JWT is refreshed rather than
// surfacing as a failed lock, and that an unfamiliar status is never read as
// "the phone is locked".

import "./setup-env.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MosyleAdapter } from "../src/mdm/MosyleAdapter.js";
import { MdmError } from "../src/mdm/types.js";

interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function stub(responder: (call: Call, index: number) => { status: number; body: unknown }) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body ?? "{}")),
    };
    calls.push(call);
    const { status, body } = responder(call, calls.length - 1);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: String(status),
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

beforeEach(() => {
  process.env.MOSYLE_API_URL = "https://businessapi.mosyle.test/v2";
  process.env.MOSYLE_ACCESS_TOKEN = "api-key-123";
  process.env.MOSYLE_EMAIL = "admin@golden.one";
  process.env.MOSYLE_PASSWORD = "admin-password";
});

describe("MosyleAdapter credentials", () => {
  it("logs in once and reuses the JWT for later calls", async () => {
    const { fetchImpl, calls } = stub((call) =>
      call.url.endsWith("/login")
        ? { status: 200, body: { token: "jwt-abc" } }
        : { status: 200, body: { status: "PENDING", commandId: "c1" } },
    );
    const mdm = new MosyleAdapter({ fetchImpl });

    await mdm.lock("SERIAL1", { message: "m", phone: "+998" });
    await mdm.unlock("SERIAL1");

    assert.equal(calls.filter((c) => c.url.endsWith("/login")).length, 1);

    // The API key travels in the body; the Authorization header carries the JWT
    // from the login. Sending the key as the bearer is what Mosyle rejects.
    const command = calls.find((c) => c.url.includes("/devices/command"))!;
    assert.equal(command.headers.Authorization, "Bearer jwt-abc");
    assert.equal(command.body.accessToken, "api-key-123");
    assert.notEqual(command.headers.Authorization, "Bearer api-key-123");
  });

  it("re-authenticates once when the JWT has expired", async () => {
    let commandAttempts = 0;
    const { fetchImpl, calls } = stub((call) => {
      if (call.url.endsWith("/login")) return { status: 200, body: { token: `jwt-${calls.length}` } };
      commandAttempts += 1;
      // First command call is rejected as expired, the retry succeeds.
      return commandAttempts === 1
        ? { status: 401, body: { message: "token expired" } }
        : { status: 200, body: { status: "PENDING", commandId: "c9" } };
    });
    const mdm = new MosyleAdapter({ fetchImpl });

    const result = await mdm.lock("SERIAL2", { message: "m", phone: "+998" });
    assert.equal(result.status, "PENDING");
    assert.equal(result.commandId, "c9");
    assert.equal(calls.filter((c) => c.url.endsWith("/login")).length, 2);
  });

  it("refuses to run without an administrator login", async () => {
    delete process.env.MOSYLE_EMAIL;
    const mdm = new MosyleAdapter({ fetchImpl: stub(() => ({ status: 200, body: {} })).fetchImpl });
    await assert.rejects(() => mdm.unlock("SERIAL3"), MdmError);
  });
});

describe("MosyleAdapter status mapping", () => {
  const cases: Array<[string, "ACKNOWLEDGED" | "PENDING" | "ERROR"]> = [
    ["ACKNOWLEDGED", "ACKNOWLEDGED"],
    ["COMPLETE", "ACKNOWLEDGED"],
    ["FAILED", "ERROR"],
    ["ERROR", "ERROR"],
    ["QUEUED", "PENDING"],
    ["something-unfamiliar", "PENDING"],
  ];

  for (const [vendor, expected] of cases) {
    it(`maps "${vendor}" to ${expected}`, async () => {
      const { fetchImpl } = stub((call) =>
        call.url.endsWith("/login")
          ? { status: 200, body: { token: "jwt" } }
          : { status: 200, body: { status: vendor, commandId: "x" } },
      );
      const mdm = new MosyleAdapter({ fetchImpl });
      const result = await mdm.lock("S", { message: "m", phone: "p" });
      assert.equal(result.status, expected);
    });
  }

  it("surfaces an API error rather than reporting a lock", async () => {
    const { fetchImpl } = stub((call) =>
      call.url.endsWith("/login")
        ? { status: 200, body: { token: "jwt" } }
        : { status: 500, body: { message: "upstream exploded" } },
    );
    const mdm = new MosyleAdapter({ fetchImpl });
    await assert.rejects(() => mdm.lock("S", { message: "m", phone: "p" }), /upstream exploded/);
  });
});
