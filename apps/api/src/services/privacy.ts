import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export function hashContactIdentifier(contact?: string) {
  if (!contact) {
    return undefined;
  }

  return createHash("sha256")
    .update(`${env.submissionHashSalt}:${contact.trim().toLowerCase()}`)
    .digest("hex");
}

export function createTrackingCode() {
  return `SL-${randomBytes(4).toString("hex").toUpperCase()}`;
}
