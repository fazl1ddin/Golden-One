// Audit service — the append-only compliance trail.
//
// Every entry names who acted, on what, and from where. Locking a customer's
// phone is an act under the loan agreement, so this record has to stand up
// months later: nothing here updates or deletes rows.

import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import type { AuditAction } from "../domain.js";

export interface AuditInput {
  actorName: string;
  actorId?: string | null;
  action: AuditAction;
  deviceId?: string | null;
  contractId?: string | null;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Prisma.InputJsonValue;
}

export function recordAudit(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorName: input.actorName,
      actorId: input.actorId ?? null,
      action: input.action,
      deviceId: input.deviceId ?? null,
      contractId: input.contractId ?? null,
      reason: input.reason ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      ...(input.meta === undefined ? {} : { meta: input.meta }),
    },
  });
}

export interface AuditListQuery {
  limit?: number;
  /** Id of the last row from the previous page. */
  cursor?: string;
  deviceId?: string;
  action?: AuditAction;
}

/**
 * Cursor pagination, not offset: the audit table only grows, and an operator
 * paging through it while new entries land would otherwise see rows shift.
 */
export async function listAudit(query: AuditListQuery = {}) {
  const limit = Math.min(query.limit ?? 50, 200);

  const items = await prisma.auditLog.findMany({
    where: {
      ...(query.deviceId ? { deviceId: query.deviceId } : {}),
      ...(query.action ? { action: query.action } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  return {
    items: page,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}
