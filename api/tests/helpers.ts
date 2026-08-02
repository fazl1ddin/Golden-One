// Test harness: a real app instance against a real database.
//
// These are integration tests on purpose. The behaviour that matters here —
// a role guard refusing a lock, a device staying pending until the MDM
// confirms, an audit row that cannot be rewritten — lives in the seams between
// Fastify, Prisma and the MDM adapter, which unit tests with mocks would step
// straight over.

// Must come first — it configures the environment before src/config.ts reads it.
import "./setup-env.js";

import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/auth/password.js";
import type { Role } from "../src/domain.js";

export { prisma };

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "AuditLog", "MdmCommand", "Device", "LoanContract", "Customer", "User" RESTART IDENTITY CASCADE',
  );
}

export async function createApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: Role;
}

export async function createUser(
  role: Role,
  overrides: Partial<{ email: string; name: string; active: boolean }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `${role.toLowerCase()}@test.local`;
  const password = "test-password-1234";
  const user = await prisma.user.create({
    data: {
      email,
      name: overrides.name ?? `Test ${role}`,
      role,
      active: overrides.active ?? true,
      passwordHash: await hashPassword(password),
    },
  });
  return { id: user.id, email, password, role };
}

export async function tokenFor(
  app: FastifyInstance,
  user: TestUser,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: user.email, password: user.password },
  });
  const body = res.json();
  if (res.statusCode !== 200) {
    throw new Error(`login failed: ${res.statusCode} ${JSON.stringify(body)}`);
  }
  return body.token as string;
}

export function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

/** A customer + contract + enrolled device, as enrollment would create them. */
export async function seedDevice(
  options: { lockStatus?: string; contractStatus?: string; serial?: string } = {},
) {
  const serial = options.serial ?? `TESTSERIAL${Math.floor(Math.random() * 1e4)}`;
  const customer = await prisma.customer.create({
    data: { fullName: "Дилшод Рахимов", phone: "+998 90 123-45-67", doc: "AA1234567" },
  });
  const contract = await prisma.loanContract.create({
    data: {
      number: `GO-TEST-${Math.floor(Math.random() * 1e6)}`,
      customerId: customer.id,
      amount: 9_800_000,
      monthly: 980_000,
      paid: 2_940_000,
      daysOverdue: 12,
      status: (options.contractStatus ?? "OVERDUE") as never,
    },
  });
  return prisma.device.create({
    data: {
      serial,
      imei: String(356728000000000 + Math.floor(Math.random() * 1e6)),
      model: "iPhone 15",
      ios: "17.5",
      customerId: customer.id,
      contractId: contract.id,
      lockStatus: (options.lockStatus ?? "UNLOCKED") as never,
    },
  });
}

export const LOCK_PAYLOAD = {
  message: "Устройство заблокировано в связи с просрочкой платежа.",
  phone: "+998 71 200-00-00",
};
