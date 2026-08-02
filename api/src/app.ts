// Fastify app factory: CORS, error handling, routes.
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { registerRoutes } from "./routes/index.js";
import { MdmError } from "./mdm/index.js";
import { AppError } from "./services/errors.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });

  // CORS: allow all origins for dev.
  await app.register(cors, { origin: true });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten(),
      });
      return;
    }
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
      return;
    }
    if (error instanceof MdmError) {
      request.log.error({ err: error }, "MDM adapter error");
      reply.code(502).send({
        error: "MDM_ERROR",
        message: error.message,
        provider: error.provider,
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    const status = error.statusCode ?? 500;
    reply.code(status).send({
      error: status >= 500 ? "INTERNAL_ERROR" : "ERROR",
      message: status >= 500 ? "Internal server error" : error.message,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  await app.register(registerRoutes);

  return app;
}
