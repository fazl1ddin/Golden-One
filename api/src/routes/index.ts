// REST routes. Handlers validate input, resolve the acting user from the
// verified token, and delegate to services.
//
// Every route below /api requires authentication, and the destructive ones
// carry an explicit permission guard — so adding a route without deciding who
// may call it is a visible omission rather than a silent hole.

import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { requireUser } from "../auth/plugin.js";
import {
  auditQuery,
  changePasswordBody,
  createUserBody,
  deviceListQuery,
  enrollBody,
  loginBody,
  lockBody,
  setUserActiveBody,
  simpleActionBody,
  unlockBody,
} from "../schemas.js";
import { listAudit } from "../services/audit.service.js";
import {
  changePassword,
  createUser,
  listUsers,
  login,
  setUserActive,
} from "../services/auth.service.js";
import {
  getDeviceDetail,
  getStats,
  listDevices,
  locateDevice,
  lockDevice,
  playSoundOnDevice,
  reconcilePendingCommands,
  releaseDevice,
  unlockDevice,
} from "../services/device.service.js";
import { enrollDevice } from "../services/enroll.service.js";
import { AppError } from "../services/errors.js";

interface IdParams {
  id: string;
}

/** Identity + provenance for the audit trail, taken from the verified token. */
function actorFrom(req: FastifyRequest) {
  const user = requireUser(req);
  return {
    id: user.id,
    name: user.name,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

function idempotencyKey(req: FastifyRequest): string | undefined {
  const raw = req.headers["idempotency-key"];
  const key = Array.isArray(raw) ? raw[0] : raw;
  return key?.trim() || undefined;
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  /* ── Public ─────────────────────────────────────────────────────────── */

  app.post("/api/auth/login", {
    // Tighter than the global budget: this is the endpoint worth guessing at.
    config: {
      rateLimit: {
        max: config.LOGIN_RATE_LIMIT_MAX,
        timeWindow: config.RATE_LIMIT_WINDOW,
      },
    },
    handler: async (req) => {
      const body = loginBody.parse(req.body ?? {});
      return login(app, body.email, body.password, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
    },
  });

  /* ── Session ────────────────────────────────────────────────────────── */

  app.get("/api/auth/me", {
    preHandler: app.authenticate,
    handler: async (req) => ({ user: requireUser(req) }),
  });

  app.post("/api/auth/password", {
    preHandler: app.authenticate,
    handler: async (req) => {
      const body = changePasswordBody.parse(req.body ?? {});
      const user = requireUser(req);
      return changePassword(user.id, body.currentPassword, body.newPassword);
    },
  });

  /* ── Devices ────────────────────────────────────────────────────────── */

  app.get("/api/stats", {
    preHandler: app.requirePermission("device:read"),
    handler: async () => getStats(),
  });

  app.get("/api/devices", {
    preHandler: app.requirePermission("device:read"),
    handler: async (req) => listDevices(deviceListQuery.parse(req.query)),
  });

  app.get<{ Params: IdParams }>("/api/devices/:id", {
    preHandler: app.requirePermission("device:read"),
    handler: async (req) => getDeviceDetail(req.params.id),
  });

  const commandRateLimit = {
    rateLimit: {
      max: config.COMMAND_RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW,
    },
  };

  app.post<{ Params: IdParams }>("/api/devices/:id/lock", {
    preHandler: app.requirePermission("device:lock"),
    config: commandRateLimit,
    handler: async (req) => {
      const body = lockBody.parse(req.body ?? {});
      return lockDevice(req.params.id, {
        actor: actorFrom(req),
        reason: body.reason,
        message: body.message,
        phone: body.phone,
        idempotencyKey: idempotencyKey(req),
      });
    },
  });

  app.post<{ Params: IdParams }>("/api/devices/:id/unlock", {
    preHandler: app.requirePermission("device:unlock"),
    config: commandRateLimit,
    handler: async (req) => {
      const body = unlockBody.parse(req.body ?? {});
      return unlockDevice(req.params.id, {
        actor: actorFrom(req),
        reason: body.reason,
        idempotencyKey: idempotencyKey(req),
      });
    },
  });

  app.post<{ Params: IdParams }>("/api/devices/:id/locate", {
    preHandler: app.requirePermission("device:command"),
    config: commandRateLimit,
    handler: async (req) => {
      const body = simpleActionBody.parse(req.body ?? {});
      return locateDevice(req.params.id, {
        actor: actorFrom(req),
        reason: body.reason,
      });
    },
  });

  app.post<{ Params: IdParams }>("/api/devices/:id/sound", {
    preHandler: app.requirePermission("device:command"),
    config: commandRateLimit,
    handler: async (req) => {
      const body = simpleActionBody.parse(req.body ?? {});
      return playSoundOnDevice(req.params.id, {
        actor: actorFrom(req),
        reason: body.reason,
      });
    },
  });

  app.post<{ Params: IdParams }>("/api/devices/:id/release", {
    preHandler: app.requirePermission("device:release"),
    config: commandRateLimit,
    handler: async (req) => {
      const body = simpleActionBody.parse(req.body ?? {});
      return releaseDevice(req.params.id, {
        actor: actorFrom(req),
        reason: body.reason,
      });
    },
  });

  /* ── Enrollment ─────────────────────────────────────────────────────── */

  app.post("/api/enroll", {
    preHandler: app.requirePermission("device:enroll"),
    handler: async (req, reply) => {
      const body = enrollBody.parse(req.body ?? {});
      try {
        const device = await enrollDevice({
          actor: actorFrom(req),
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
    },
  });

  /* ── Audit ──────────────────────────────────────────────────────────── */

  app.get("/api/audit", {
    preHandler: app.requirePermission("audit:read"),
    handler: async (req) => listAudit(auditQuery.parse(req.query)),
  });

  /* ── Operations ─────────────────────────────────────────────────────── */

  app.post("/api/commands/reconcile", {
    preHandler: app.requirePermission("user:manage"),
    handler: async () => reconcilePendingCommands(),
  });

  /* ── User administration ────────────────────────────────────────────── */

  app.get("/api/users", {
    preHandler: app.requirePermission("user:manage"),
    handler: async () => listUsers(),
  });

  app.post("/api/users", {
    preHandler: app.requirePermission("user:manage"),
    handler: async (req, reply) => {
      const body = createUserBody.parse(req.body ?? {});
      const user = requireUser(req);
      const created = await createUser(body, { id: user.id, name: user.name });
      reply.code(201);
      return created;
    },
  });

  app.patch<{ Params: IdParams }>("/api/users/:id/active", {
    preHandler: app.requirePermission("user:manage"),
    handler: async (req) => {
      const body = setUserActiveBody.parse(req.body ?? {});
      const user = requireUser(req);
      return setUserActive(req.params.id, body.active, {
        id: user.id,
        name: user.name,
      });
    },
  });
}
