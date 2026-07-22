// REST route registration. Handlers validate input with Zod and delegate all
// business logic to the service layer.

import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  auditQuery,
  deviceListQuery,
  enrollBody,
  lockBody,
  simpleActionBody,
  unlockBody,
} from "../schemas.js";
import { listAudit } from "../services/audit.service.js";
import {
  getDeviceDetail,
  getStats,
  listDevices,
  locateDevice,
  lockDevice,
  playSoundOnDevice,
  unlockDevice,
} from "../services/device.service.js";
import { enrollDevice } from "../services/enroll.service.js";
import { AppError } from "../services/errors.js";

const DEFAULT_ACTOR = "Оператор";

function resolveActor(req: FastifyRequest, bodyActor?: string): string {
  const header = req.headers["x-actor"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return bodyActor?.trim() || fromHeader?.trim() || DEFAULT_ACTOR;
}

interface IdParams {
  id: string;
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({
    status: "ok",
    service: "golden-one-api",
    mdmProvider: process.env.MDM_PROVIDER ?? "mock",
    time: new Date().toISOString(),
  }));

  app.get("/api/stats", async () => getStats());

  app.get("/api/devices", async (req) => {
    const query = deviceListQuery.parse(req.query);
    return listDevices(query);
  });

  app.get<{ Params: IdParams }>("/api/devices/:id", async (req) =>
    getDeviceDetail(req.params.id),
  );

  app.post<{ Params: IdParams }>("/api/devices/:id/lock", async (req) => {
    const body = lockBody.parse(req.body ?? {});
    const actorName = resolveActor(req, body.actorName);
    return lockDevice(req.params.id, {
      actorName,
      reason: body.reason,
      message: body.message,
      phone: body.phone,
    });
  });

  app.post<{ Params: IdParams }>("/api/devices/:id/unlock", async (req) => {
    const body = unlockBody.parse(req.body ?? {});
    const actorName = resolveActor(req, body.actorName);
    return unlockDevice(req.params.id, { actorName, reason: body.reason });
  });

  app.post<{ Params: IdParams }>("/api/devices/:id/locate", async (req) => {
    const body = simpleActionBody.parse(req.body ?? {});
    const actorName = resolveActor(req, body.actorName);
    return locateDevice(req.params.id, { actorName, reason: body.reason });
  });

  app.post<{ Params: IdParams }>("/api/devices/:id/sound", async (req) => {
    const body = simpleActionBody.parse(req.body ?? {});
    const actorName = resolveActor(req, body.actorName);
    return playSoundOnDevice(req.params.id, { actorName, reason: body.reason });
  });

  app.post("/api/enroll", async (req, reply) => {
    const body = enrollBody.parse(req.body ?? {});
    const actorName = resolveActor(req, body.actorName);
    try {
      const device = await enrollDevice({
        actorName,
        customer: body.customer,
        contract: body.contract,
        device: body.device,
      });
      reply.code(201);
      return device;
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        throw new AppError(
          "A device with this serial/IMEI or a contract with this number already exists.",
          409,
          "CONFLICT",
        );
      }
      throw err;
    }
  });

  app.get("/api/audit", async (req) => {
    const { limit } = auditQuery.parse(req.query);
    return listAudit(limit ?? 100);
  });
}
