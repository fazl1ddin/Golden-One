// Authentication and authorization.
//
// `authenticate` verifies the bearer token, then re-reads the user from the
// database on every request. That costs one indexed lookup, and buys the thing
// that matters here: an operator who is deactivated, demoted, or force-logged-out
// loses the ability to lock a customer's phone immediately, not whenever their
// token happens to expire.

import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { prisma } from "../db.js";
import type { Permission, Role } from "../domain.js";
import { roleHas } from "../domain.js";
import { AppError } from "../services/errors.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Claims we mint. `v` is the token version used for revocation. */
export interface AccessTokenClaims {
  sub: string;
  role: Role;
  v: number;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (
      permission: Permission,
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenClaims;
    user: AccessTokenClaims;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

async function authPlugin(app: FastifyInstance): Promise<void> {
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  });

  app.decorate(
    "authenticate",
    async function authenticate(req: FastifyRequest): Promise<void> {
      let claims: AccessTokenClaims;
      try {
        claims = await req.jwtVerify<AccessTokenClaims>();
      } catch {
        throw new UnauthorizedError("Invalid or expired token");
      }

      const user = await prisma.user.findUnique({
        where: { id: claims.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          tokenVersion: true,
        },
      });

      if (!user || !user.active) {
        throw new UnauthorizedError("Account is not active");
      }
      if (user.tokenVersion !== claims.v) {
        throw new UnauthorizedError("Session has been revoked, sign in again");
      }

      req.authUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      };
    },
  );

  app.decorate("requirePermission", (permission: Permission) => {
    return async function guard(req: FastifyRequest, reply: FastifyReply) {
      if (!req.authUser) await app.authenticate(req, reply);
      const user = req.authUser;
      if (!user) throw new UnauthorizedError();
      if (!roleHas(user.role, permission)) {
        req.log.warn(
          { userId: user.id, role: user.role, permission },
          "permission denied",
        );
        throw new ForbiddenError(
          `Role ${user.role} is not allowed to ${permission.replace(":", " ")}`,
        );
      }
    };
  });
}

export default fp(authPlugin, { name: "auth" });

/** Throws unless the request has been through `authenticate`. */
export function requireUser(req: FastifyRequest): AuthUser {
  if (!req.authUser) throw new UnauthorizedError();
  return req.authUser;
}
