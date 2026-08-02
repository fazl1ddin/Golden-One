// Audit service — records and reads the compliance audit trail.
import { prisma } from "../db.js";

export interface AuditInput {
  actorName: string;
  action: string;
  deviceId?: string | null;
  contractId?: string | null;
  reason?: string | null;
}

export function recordAudit(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorName: input.actorName,
      action: input.action,
      deviceId: input.deviceId ?? null,
      contractId: input.contractId ?? null,
      reason: input.reason ?? null,
    },
  });
}

export function listAudit(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
