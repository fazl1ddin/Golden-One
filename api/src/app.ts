// Fastify app factory: security middleware, error handling, routes.

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { createHash, randomUUID } from "node:crypto";
import { ZodError } from "zod";
import authPlugin from "./auth/plugin.js";
import { config, isProduction, isTest } from "./config.js";
import { prisma } from "./db.js";
import { getDeviceManager, MdmError } from "./mdm/index.js";
import { registerRoutes } from "./routes/index.js";
import { AppError } from "./services/errors.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: isTest ? "silent" : config.LOG_LEVEL,
      // Tokens and passwords must never reach the log store.
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "body.password",
          "body.currentPassword",
          "body.newPassword",
        ],
        censor: "[redacted]",
      },
    },
    genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
    // Client IPs feed rate limiting and the audit trail, so only trust
    // forwarding headers when actually running behind a known proxy.
    trustProxy: config.TRUST_PROXY,
    disableRequestLogging: isTest,
  });

  await app.register(helmet, {
    // The API serves JSON to a separate origin; a page-oriented CSP would add
    // nothing here and only be misleading.
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: config.corsOrigins.includes("*") ? true : config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Request-Id",
    ],
  });

  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    // Key on the session rather than the IP, so one operator cannot exhaust the
    // budget for colleagues sharing a branch connection.
    //
    // The limiter runs on onRequest, before authentication, so req.authUser is
    // not populated yet — the bearer token is hashed instead of verified. That
    // is the right trade here: hashing is cheap, and a forged or expired token
    // still lands in its own bucket, so it cannot be used to drain someone
    // else's. Unauthenticated calls (login) fall back to the IP.
    keyGenerator: (req) => {
      const header = req.headers.authorization;
      if (header?.startsWith("Bearer ")) {
        return `t:${createHash("sha256").update(header.slice(7)).digest("base64url")}`;
      }
      return `ip:${req.ip}`;
    },
  });

  await app.register(authPlugin);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten(),
        requestId: request.id,
      });
      return;
    }
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
        requestId: request.id,
      });
      return;
    }
    if (error instanceof MdmError) {
      request.log.error({ err: error }, "MDM adapter error");
      reply.code(502).send({
        error: "MDM_ERROR",
        message: error.message,
        provider: error.provider,
        requestId: request.id,
      });
      return;
    }
    if (error.statusCode === 429) {
      reply.code(429).send({
        error: "RATE_LIMITED",
        message: "Too many requests, slow down",
        requestId: request.id,
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    const status = error.statusCode ?? 500;
    reply.code(status).send({
      error: status >= 500 ? "INTERNAL_ERROR" : "ERROR",
      // Never surface the internals of a 500 to a caller.
      message: status >= 500 ? "Internal server error" : error.message,
      requestId: request.id,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
      requestId: request.id,
    });
  });

  /* ── Health ───────────────────────────────────────────────────────────
   * Liveness answers "is the process up"; readiness answers "can it actually
   * serve traffic". An orchestrator must not route requests to an instance
   * whose database is unreachable, so these stay separate.
   */
  app.get("/health/live", async () => ({
    status: "ok",
    uptime: process.uptime(),
  }));

  app.get("/health/ready", async (_req, reply) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "unreachable";
      healthy = false;
    }
    checks.mdmProvider = getDeviceManager().provider;

    if (!healthy) reply.code(503);
    return {
      status: healthy ? "ok" : "degraded",
      service: "golden-one-api",
      env: config.NODE_ENV,
      checks,
      time: new Date().toISOString(),
    };
  });

  // Kept for existing probes and the smoke script.
  app.get("/health", async () => ({
    status: "ok",
    service: "golden-one-api",
    mdmProvider: getDeviceManager().provider,
    env: config.NODE_ENV,
    time: new Date().toISOString(),
  }));

  await app.register(registerRoutes);

  if (isProduction) app.log.info("Golden One API started in production mode");

  return app;
}
