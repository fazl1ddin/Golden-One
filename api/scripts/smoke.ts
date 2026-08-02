// Post-deploy smoke check.
//
// Unlike the test suite (which boots its own app against a test database), this
// runs against an already-deployed instance and answers the questions you want
// answered right after a release: is it up, can it reach its database, and is
// the authentication wall actually in front of the dangerous endpoints.
//
//   npm run smoke -- https://api.golden.one
//   SMOKE_EMAIL=... SMOKE_PASSWORD=... npm run smoke -- https://api.golden.one

const base = (
  process.argv[2] ??
  process.env.SMOKE_URL ??
  "http://127.0.0.1:4000"
).replace(/\/+$/, "");

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed += 1;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function req(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function main(): Promise<void> {
  console.log(`Smoke-checking ${base}\n`);

  const live = await req("/health/live");
  check("liveness responds", live.status === 200, `status=${live.status}`);

  const ready = await req("/health/ready");
  check(
    "readiness reports healthy",
    ready.status === 200 && ready.body?.status === "ok",
    `status=${ready.status} db=${ready.body?.checks?.database}`,
  );
  check(
    "an MDM provider is configured",
    Boolean(ready.body?.checks?.mdmProvider),
    `provider=${ready.body?.checks?.mdmProvider}`,
  );
  if (ready.body?.env === "production" && ready.body?.checks?.mdmProvider === "mock") {
    check(
      "production is not running the mock MDM",
      false,
      "MDM_PROVIDER=mock would report locks that never reach a device",
    );
  }

  // The whole product rests on these being unreachable without a token.
  for (const path of ["/api/devices", "/api/stats", "/api/audit", "/api/users"]) {
    const res = await req(path);
    check(`${path} requires authentication`, res.status === 401, `status=${res.status}`);
  }

  const anonLock = await req("/api/devices/any-id/lock", {
    method: "POST",
    body: JSON.stringify({ message: "x", phone: "+998" }),
  });
  check(
    "locking requires authentication",
    anonLock.status === 401,
    `status=${anonLock.status}`,
  );

  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (email && password) {
    const login = await req("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    check("credentials are accepted", login.status === 200, `status=${login.status}`);

    if (login.body?.token) {
      const headers = { authorization: `Bearer ${login.body.token}` };

      const me = await req("/api/auth/me", { headers });
      check("token identifies the user", me.status === 200, `role=${me.body?.user?.role}`);

      const devices = await req("/api/devices?limit=1", { headers });
      check(
        "device list is reachable with a token",
        devices.status === 200,
        `status=${devices.status}`,
      );
    }
  } else {
    console.log(
      "\n(set SMOKE_EMAIL and SMOKE_PASSWORD to also verify login and an authenticated read)",
    );
  }

  console.log(
    `\nSMOKE: ${failed === 0 ? "PASS" : "FAIL"}, ${passed} passed, ${failed} failed`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke check could not run:", err);
  process.exit(1);
});
