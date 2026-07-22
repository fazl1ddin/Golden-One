// Enrollment service — registers a financed device at point of sale:
// creates Customer + LoanContract + Device (supervised, ENROLLED) atomically.

import type { ContractStatus } from "../domain.js";
import { prisma } from "../db.js";
import { recordAudit } from "./audit.service.js";

export interface EnrollInput {
  actorName: string;
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
    actorName: input.actorName,
    action: "ENROLL",
    deviceId: created.id,
    contractId: created.contractId,
    reason: `Enrolled ${created.model} (${created.serial})`,
  });

  return created;
}
