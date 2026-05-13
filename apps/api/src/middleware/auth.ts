import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/citizen-auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      citizenId?: string;
    }
  }
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function optionalCitizen(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = readBearer(req);
  if (token) {
    const id = verifyToken(token);
    if (id) req.citizenId = id;
  }
  next();
}

export function requireCitizen(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = readBearer(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const id = verifyToken(token);
  if (!id) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.citizenId = id;
  next();
}

/**
 * Demo-only institution gate. Matches X-Institution-Key against the env
 * value. To be replaced with proper institution auth in a future iteration.
 */
export function requireInstitutionKey(envValue: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const provided = req.headers["x-institution-key"];
    if (typeof provided !== "string" || provided !== envValue) {
      res.status(401).json({ error: "Institution key required" });
      return;
    }
    next();
  };
}

export {};
