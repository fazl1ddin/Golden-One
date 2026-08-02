// Password hashing.
//
// Uses scrypt from Node's standard library — memory-hard, no native build step,
// and available everywhere this runs. Hashes are self-describing
// (`scrypt$N$r$p$salt$hash`) so parameters can be raised later without
// invalidating existing passwords.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LEN = 32;
const SALT_LEN = 16;
// scrypt's default maxmem (32 MiB) is below what N=2^15,r=8 needs.
const maxmem = 256 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LEN, {
    ...PARAMS,
    maxmem,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4]!, "base64");
    expected = Buffer.from(parts[5]!, "base64");
  } catch {
    return false;
  }

  const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
    N,
    r,
    p,
    maxmem,
  });
  // Lengths are equal by construction, but timingSafeEqual throws otherwise.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
