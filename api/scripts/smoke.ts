// Smoke test — boots the server on a test port and exercises key endpoints,
// printing PASS/FAIL for each. Exits non-zero if any check fails.
import "../src/env.js";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const PORT = Number(process.env.SMOKE_PORT ?? 4599);
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed++;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function getJson(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function postJson(
  path: string,
  data: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`Smoke server listening on ${BASE}\n`);

  try {
    // 1. Health
    {
      const { status, body } = await getJson("/health");
      check("GET /health", status === 200 && body?.status === "ok", `status=${status}`);
    }

    // 2. Stats
    let statsBefore: any;
    {
      const { status, body } = await getJson("/api/stats");
      statsBefore = body;
      check(
        "GET /api/stats",
        status === 200 && typeof body?.totalDevices === "number",
        `totalDevices=${body?.totalDevices} locked=${body?.lockedDevices} overdue=${body?.overdueContracts}`,
      );
    }

    // 3. Devices list
    let targetId = "";
    {
      const { status, body } = await getJson("/api/devices");
      const list = Array.isArray(body) ? body : [];
      // pick an unlocked device to lock.
      const target = list.find((d: any) => d.lockStatus === "UNLOCKED") ?? list[0];
      targetId = target?.id ?? "";
      check(
        "GET /api/devices",
        status === 200 && list.length > 0 && Boolean(targetId),
        `count=${list.length} target=${target?.serial ?? "none"}`,
      );
    }

    // 4. Audit count before lock
    const auditBefore = (await getJson("/api/audit")).body?.length ?? 0;

    // 5. Lock
    {
      const { status, body } = await postJson(
        `/api/devices/${targetId}/lock`,
        { reason: "smoke-test overdue", message: "Заблокировано (smoke)", phone: "+998 71 200-00-00" },
        { "x-actor": "SmokeBot" },
      );
      const locked = body?.device?.lockStatus === "LOCKED";
      const hasLockCommand = (body?.device?.commands ?? []).some(
        (c: any) => c.type === "LOCK",
      );
      check(
        "POST /api/devices/:id/lock -> LOCKED",
        status === 200 && locked,
        `lockStatus=${body?.device?.lockStatus}`,
      );
      check(
        "MdmCommand LOCK recorded",
        hasLockCommand,
        `command.status=${body?.command?.status}`,
      );
    }

    // 6. Audit + command persisted in DB
    {
      const auditAfter = (await getJson("/api/audit")).body ?? [];
      const grew = auditAfter.length > auditBefore;
      const lockEntry = auditAfter.find(
        (a: any) => a.action === "LOCK" && a.deviceId === targetId && a.actorName === "SmokeBot",
      );
      check(
        "AuditLog grew after lock",
        grew && Boolean(lockEntry),
        `before=${auditBefore} after=${auditAfter.length}`,
      );

      const dbCommands = await prisma.mdmCommand.count({
        where: { deviceId: targetId, type: "LOCK" },
      });
      check("MdmCommand LOCK row in DB", dbCommands >= 1, `count=${dbCommands}`);
    }

    // 7. Stats reflect the new lock
    {
      const { body } = await getJson("/api/stats");
      check(
        "Stats lockedDevices increased",
        body?.lockedDevices === (statsBefore?.lockedDevices ?? 0) + 1,
        `before=${statsBefore?.lockedDevices} after=${body?.lockedDevices}`,
      );
    }

    // 8. Unlock
    {
      const { status, body } = await postJson(
        `/api/devices/${targetId}/unlock`,
        { reason: "smoke-test payment received" },
        { "x-actor": "SmokeBot" },
      );
      check(
        "POST /api/devices/:id/unlock -> UNLOCKED",
        status === 200 && body?.device?.lockStatus === "UNLOCKED",
        `lockStatus=${body?.device?.lockStatus}`,
      );
    }
  } catch (err) {
    check("smoke run", false, String(err));
  } finally {
    await app.close();
    await prisma.$disconnect();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? "SMOKE: PASS" : "SMOKE: FAIL");
  process.exit(failed === 0 ? 0 : 1);
}

void main();
