// Seed script — mirrors the demo data from prototype/index.html.
import "../src/env.js";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password.js";
import type {
  ContractStatus,
  EnrollmentStatus,
  LockStatus,
} from "../src/domain.js";

const prisma = new PrismaClient();

interface SeedRow {
  fullName: string;
  phone: string;
  doc: string;
  model: string;
  serial: string;
  imei: string;
  ios: string;
  contract: string;
  amount: number;
  monthly: number;
  paid: number;
  next: string | null;
  daysOverdue: number;
  status: ContractStatus;
  enrollment: EnrollmentStatus;
  lock: LockStatus;
}

const rows: SeedRow[] = [
  {
    fullName: "Дилшод Рахимов",
    phone: "+998 90 123-45-67",
    doc: "AA1234567",
    model: "iPhone 15",
    serial: "F2LW9K3QH1",
    imei: "356728111234567",
    ios: "17.5",
    contract: "GO-2024-0417",
    amount: 9_800_000,
    monthly: 980_000,
    paid: 2_940_000,
    next: "2026-07-10",
    daysOverdue: 12,
    status: "OVERDUE",
    enrollment: "ENROLLED",
    lock: "UNLOCKED",
  },
  {
    fullName: "Нигора Юсупова",
    phone: "+998 91 222-33-44",
    doc: "AB2345678",
    model: "iPhone 14",
    serial: "G8XM2P0RT4",
    imei: "356728119876543",
    ios: "17.4",
    contract: "GO-2024-0389",
    amount: 8_200_000,
    monthly: 820_000,
    paid: 820_000,
    next: "2026-06-28",
    daysOverdue: 24,
    status: "OVERDUE",
    enrollment: "ENROLLED",
    lock: "LOCKED",
  },
  {
    fullName: "Сардор Алиев",
    phone: "+998 93 555-66-77",
    doc: "AC3456789",
    model: "iPhone 15 Pro",
    serial: "H1KD7L9WQ2",
    imei: "356728115556677",
    ios: "17.5",
    contract: "GO-2025-0102",
    amount: 14_500_000,
    monthly: 1_208_000,
    paid: 7_250_000,
    next: "2026-08-05",
    daysOverdue: 0,
    status: "ACTIVE",
    enrollment: "ENROLLED",
    lock: "UNLOCKED",
  },
  {
    fullName: "Малика Ниязова",
    phone: "+998 90 888-99-00",
    doc: "AD4567890",
    model: "iPhone 13",
    serial: "J3PR5T2XN8",
    imei: "356728113334455",
    ios: "17.3",
    contract: "GO-2025-0148",
    amount: 6_900_000,
    monthly: 690_000,
    paid: 4_830_000,
    next: "2026-08-01",
    daysOverdue: 6,
    status: "OVERDUE",
    enrollment: "ENROLLED",
    lock: "UNLOCKED",
  },
  {
    fullName: "Тимур Бекмуратов",
    phone: "+998 94 111-22-33",
    doc: "AE5678901",
    model: "iPhone 15",
    serial: "K9WL3M1QP7",
    imei: "356728118887766",
    ios: "17.5",
    contract: "GO-2025-0201",
    amount: 9_800_000,
    monthly: 980_000,
    paid: 980_000,
    next: "2026-07-18",
    daysOverdue: 4,
    status: "OVERDUE",
    enrollment: "ENROLLED",
    lock: "UNLOCKED",
  },
  {
    fullName: "Гульнора Сафарова",
    phone: "+998 91 444-55-66",
    doc: "AF6789012",
    model: "iPhone 14 Pro",
    serial: "L2MN8K4RT9",
    imei: "356728112223344",
    ios: "17.4",
    contract: "GO-2024-0356",
    amount: 13_200_000,
    monthly: 1_100_000,
    paid: 13_200_000,
    next: null,
    daysOverdue: 0,
    status: "PAID",
    enrollment: "RELEASED",
    lock: "UNLOCKED",
  },
];

async function main(): Promise<void> {
  console.log("Seeding database...");

  // Reset. AuditLog carries a BEFORE DELETE trigger that makes it append-only,
  // so a row-by-row delete is refused by design — TRUNCATE is the deliberate
  // table-owner operation that wipes a development database. Never run this
  // against production: destroying the audit trail is the one thing the schema
  // is built to prevent.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "AuditLog", "MdmCommand", "Device", "LoanContract", "Customer", "User" RESTART IDENTITY CASCADE',
  );

  // Passwords come from the environment so a seeded deployment never ships
  // with a known credential. When unset (local dev) a random one is generated
  // and printed once — there is no default to forget to change.
  const seededUsers = [
    { email: "aziz@golden.one", name: "Азиз Каримов", role: "COLLECTIONS" as const, envKey: "SEED_COLLECTIONS_PASSWORD" },
    { email: "dilnoza@golden.one", name: "Дильноза Ахмедова", role: "POS_OPERATOR" as const, envKey: "SEED_POS_PASSWORD" },
    { email: "rustam@golden.one", name: "Рустам Юлдашев", role: "ADMIN" as const, envKey: "SEED_ADMIN_PASSWORD" },
  ];

  const issued: Array<{ email: string; role: string; password: string; generated: boolean }> = [];

  for (const u of seededUsers) {
    const fromEnv = process.env[u.envKey]?.trim();
    const password = fromEnv || `go-${randomBytes(12).toString("base64url")}`;
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: await hashPassword(password),
      },
    });
    issued.push({ email: u.email, role: u.role, password, generated: !fromEnv });
  }

  const bySerial: Record<string, string> = {};

  for (const r of rows) {
    const customer = await prisma.customer.create({
      data: { fullName: r.fullName, phone: r.phone, doc: r.doc },
    });
    const contract = await prisma.loanContract.create({
      data: {
        number: r.contract,
        customerId: customer.id,
        amount: r.amount,
        monthly: r.monthly,
        paid: r.paid,
        nextPaymentDate: r.next ? new Date(r.next) : null,
        daysOverdue: r.daysOverdue,
        status: r.status,
      },
    });
    const device = await prisma.device.create({
      data: {
        serial: r.serial,
        imei: r.imei,
        model: r.model,
        ios: r.ios,
        supervised: true,
        enrollmentStatus: r.enrollment,
        lockStatus: r.lock,
        customerId: customer.id,
        contractId: contract.id,
      },
    });
    bySerial[r.serial] = device.id;

    // Record a LOCK command for the already-locked device.
    if (r.lock === "LOCKED") {
      await prisma.mdmCommand.create({
        data: {
          deviceId: device.id,
          type: "LOCK",
          status: "ACKNOWLEDGED",
          provider: process.env.MDM_PROVIDER ?? "mock",
          providerCommandId: `seed-lock-${device.id}`,
          settledAt: new Date(),
          payload: {
            message:
              "Устройство заблокировано в связи с просрочкой платежа. Для разблокировки обратитесь в Golden One.",
            phone: "+998 71 200-00-00",
          },
        },
      });
    }
  }

  // A few audit entries mirroring the prototype activity feed.
  const yusupova = bySerial["G8XM2P0RT4"];
  const rakhimov = bySerial["F2LW9K3QH1"];
  const bekmuratov = bySerial["K9WL3M1QP7"];

  await prisma.auditLog.createMany({
    data: [
      {
        actorName: "Азиз Каримов",
        action: "LOCK",
        deviceId: yusupova,
        reason: "Просрочка 24 дня",
      },
      {
        actorName: "Система",
        action: "ENROLL",
        deviceId: bekmuratov,
        reason: "Заведение на точке продажи",
      },
      {
        actorName: "Азиз Каримов",
        action: "LOCATE",
        deviceId: rakhimov,
        reason: "Проверка местоположения",
      },
    ],
  });

  console.log("\nSeeded operator accounts:");
  for (const u of issued) {
    console.log(
      `  ${u.role.padEnd(13)} ${u.email.padEnd(22)} ${
        u.generated ? `password: ${u.password}  (generated — save it now)` : "password: from environment"
      }`,
    );
  }
  console.log();

  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    contracts: await prisma.loanContract.count(),
    devices: await prisma.device.count(),
    commands: await prisma.mdmCommand.count(),
    audit: await prisma.auditLog.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
