import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source.js";
import { Citizen } from "../entities/citizen.entity.js";
import { env } from "../config/env.js";
import { hashContactIdentifier } from "./privacy.js";

const BCRYPT_COST = 12;
const JWT_EXPIRES_IN = "30d";

export class AuthError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

/**
 * Normalize a Kenyan phone number into a canonical E.164 form (+254...).
 * Accepts: +2547XXXXXXXX, 2547XXXXXXXX, 07XXXXXXXX, 7XXXXXXXX.
 * Throws if the input cannot be coerced into +254 followed by 9 digits.
 */
export function normalizeKenyanPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  let normalized = digits;
  if (normalized.startsWith("+254")) {
    normalized = normalized.slice(4);
  } else if (normalized.startsWith("254")) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith("0")) {
    normalized = normalized.slice(1);
  }
  if (!/^[17]\d{8}$/.test(normalized)) {
    throw new AuthError("Invalid Kenyan phone number", 400);
  }
  return `+254${normalized}`;
}

function hashPhone(phone: string): string {
  // Reuses the salted SHA-256 helper. We pass the canonical E.164 form so
  // the same phone always hashes identically regardless of input format.
  const hash = hashContactIdentifier(phone);
  if (!hash) throw new AuthError("Invalid phone", 400);
  return hash;
}

export function issueToken(citizenId: string): string {
  return jwt.sign({ sub: citizenId }, env.sessionSecret, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.sessionSecret) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function registerCitizen(args: {
  phone: string;
  password: string;
  countyHint?: string;
}): Promise<{ citizen: Citizen; token: string }> {
  if (args.password.length < 8) {
    throw new AuthError("Password must be at least 8 characters", 400);
  }
  const e164 = normalizeKenyanPhone(args.phone);
  const phoneHash = hashPhone(e164);
  const repo = AppDataSource.getRepository(Citizen);

  const existing = await repo.findOne({ where: { phoneHash } });
  if (existing) {
    throw new AuthError("An account with this phone already exists", 409);
  }

  const passwordHash = await bcrypt.hash(args.password, BCRYPT_COST);
  const citizen = await repo.save(
    repo.create({
      phoneHash,
      passwordHash,
      countyHint: args.countyHint ?? null
    })
  );

  return { citizen, token: issueToken(citizen.id) };
}

export async function loginCitizen(args: {
  phone: string;
  password: string;
}): Promise<{ citizen: Citizen; token: string }> {
  const e164 = normalizeKenyanPhone(args.phone);
  const phoneHash = hashPhone(e164);
  const repo = AppDataSource.getRepository(Citizen);

  const citizen = await repo.findOne({ where: { phoneHash } });
  if (!citizen) {
    throw new AuthError("Invalid phone or password", 401);
  }
  const ok = await bcrypt.compare(args.password, citizen.passwordHash);
  if (!ok) {
    throw new AuthError("Invalid phone or password", 401);
  }
  citizen.lastLoginAt = new Date();
  await repo.save(citizen);

  return { citizen, token: issueToken(citizen.id) };
}
