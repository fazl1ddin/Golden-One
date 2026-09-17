// Enrollment service — registers a financed device at point of sale:
// creates Customer + LoanContract + Device (supervised, ENROLLED) atomically.

import type { ContractStatus } from "../domain.js";
import { prisma } from "../db.js";
import { getDeviceManager } from "../mdm/index.js";
import { recordAudit } from "./audit.service.js";
import { AppError } from "./errors.js";
import { withArrears, type ActorContext } from "./device.service.js";

export interface EnrollInput {
  actor: ActorContext;
  customer: { fullName: string; phone: string; doc: string };
  contract: {
    number: string;
    amount: number;
    monthly: number;
    paid?: number;
    nextPaymentDate?: string | null;
    daysOverdue?: number;
    status?: ContractStatus;
  };
  device: { serial: string; imei: string; model: string; ios: string };
}

export async function enrollDevice(input: EnrollInput) {
  // Verify with the MDM that this phone really is enrolled and supervised
  // before it is recorded as financed. Registering a device we cannot actually
  // command would leave collections holding a contract with no remedy.
  const mdm = getDeviceManager();
  const enrollment = await mdm.getEnrollmentStatus(input.device.serial);
  if (enrollment.state !== "ENROLLED" || !enrollment.supervised) {
    throw new AppError(
      `Device ${input.device.serial} is not enrolled and supervised in ${mdm.provider} ` +
        `(state=${enrollment.state}, supervised=${enrollment.supervised}). ` +
        "Complete Apple Configurator setup before registering it.",
      409,
      "NOT_SUPERVISED",
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        fullName: input.customer.fullName,
        phone: input.customer.phone,
        doc: input.customer.doc,
      },
    });

    const contract = await tx.loanContract.create({
      data: {
        number: input.contract.number,
        customerId: customer.id,
        amount: input.contract.amount,
        monthly: input.contract.monthly,
        paid: input.contract.paid ?? 0,
        nextPaymentDate: input.contract.nextPaymentDate
          ? new Date(input.contract.nextPaymentDate)
          : null,
        daysOverdue: input.contract.daysOverdue ?? 0,
        status: input.contract.status ?? "ACTIVE",
      },
    });

    const device = await tx.device.create({
      data: {
        serial: input.device.serial,
        imei: input.device.imei,
        model: input.device.model,
        ios: input.device.ios,
        supervised: true,
        enrollmentStatus: "ENROLLED",
        lockStatus: "UNLOCKED",
        customerId: customer.id,
        contractId: contract.id,
      },
      include: { customer: true, contract: true },
    });

    return device;
  });

  await recordAudit({
    actorId: input.actor.id,
    actorName: input.actor.name,
    action: "ENROLL",
    deviceId: created.id,
    contractId: created.contractId,
    reason: `Enrolled ${created.model} (${created.serial})`,
    ip: input.actor.ip,
    userAgent: input.actor.userAgent,
  });

  // Same shape as the list and detail endpoints, so the dashboard can render a
  // freshly enrolled device without a special case.
  return withArrears(created);
}
