// Authentication service: login, session identity, and user administration.

import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import type { Role } from "../domain.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import type { AccessTokenClaims } from "../auth/plugin.js";
import { UnauthorizedError } from "../auth/plugin.js";
import { recordAudit } from "./audit.service.js";
import { AppError, NotFoundError } from "./errors.js";

export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

export async function login(
  app: FastifyInstance,
  email: string,
  password: string,
  ctx: LoginContext = {},
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Always run a hash comparison, even when the account does not exist, so the
  // response time does not reveal which emails are registered.
  const stored =
    user?.passwordHash ??
    "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const passwordOk = await verifyPassword(password, stored);

  if (!user || !passwordOk || !user.active) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const claims: AccessTokenClaims = {
    sub: user.id,
    role: user.role as Role,
    v: user.tokenVersion,
  };
  const token = app.jwt.sign(claims);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "LOGIN",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    },
  };
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
}

export async function createUser(
  input: CreateUserInput,
  actor: { id: string; name: string },
) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError("A user with this email already exists", 409, "CONFLICT");
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "USER_CREATE",
    meta: { createdUserId: user.id, email: user.email, role: user.role },
  });

  return user;
}

/**
 * Deactivating bumps `tokenVersion`, which invalidates every token the user
 * already holds — otherwise a dismissed operator could keep locking phones
 * until their token expired.
 */
export async function setUserActive(
  id: string,
  active: boolean,
  actor: { id: string; name: string },
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError(`User ${id} not found`);

  if (!active && user.id === actor.id) {
    throw new AppError("You cannot deactivate your own account", 400, "BAD_REQUEST");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      active,
      tokenVersion: active ? user.tokenVersion : { increment: 1 },
    },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  await recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "USER_DISABLE",
    meta: { targetUserId: id, active },
  });

  return updated;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  // Bumping the version signs the user out everywhere else.
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      tokenVersion: { increment: 1 },
    },
  });

  return { ok: true };
}
