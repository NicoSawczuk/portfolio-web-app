import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);

export const AUTH_COOKIE_NAME = "auth_token";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SCRYPT_KEYLEN = 64;
const DEV_FALLBACK_AUTH_SECRET = "dev-auth-secret-change-me";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_AUTH_SECRET;
  }

  if (!secret) {
    throw new Error("Falta configurar AUTH_SECRET.");
  }

  return secret;
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = normalized + (pad ? "=".repeat(4 - pad) : "");
  return Buffer.from(padded, "base64").toString("utf8");
}

function signUnsignedToken(unsignedToken: string) {
  return toBase64Url(createHmac("sha256", getAuthSecret()).update(unsignedToken).digest());
}

function parseSessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const unsignedToken = `${headerPart}.${payloadPart}`;
  const expectedSignature = signUnsignedToken(unsignedToken);

  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(signaturePart);

  if (expectedBuffer.length !== providedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null;
  }

  try {
    const payloadRaw = fromBase64Url(payloadPart);
    const payload = JSON.parse(payloadRaw) as SessionPayload;

    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.userExpiresAt !== "number" ||
      typeof payload.sessionExpiresAt !== "number"
    ) {
      return null;
    }

    const now = Date.now();
    if (payload.userExpiresAt <= now || payload.sessionExpiresAt <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  userExpiresAt: number;
  sessionExpiresAt: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  expiration_date: string;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseExpirationDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [saltHex, keyHex] = storedHash.split(":");
  if (!saltHex || !keyHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  const derivedKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;

  if (derivedKey.length !== expectedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedKey);
}

export function isUserActive(expirationDate: string) {
  const parsed = parseExpirationDate(expirationDate);
  if (!parsed) {
    return false;
  }
  return parsed.getTime() > Date.now();
}

export function createSessionPayload(user: AuthenticatedUser): SessionPayload {
  const userExpiresAt = new Date(user.expiration_date).getTime();
  const sessionExpiresAt = Math.min(Date.now() + SESSION_TTL_MS, userExpiresAt);

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    userExpiresAt,
    sessionExpiresAt,
  };
}

export function createSessionToken(payload: SessionPayload) {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;
  const signature = signUnsignedToken(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export function verifySessionToken(token: string) {
  return parseSessionToken(token);
}

export function getSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookieToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!cookieToken) {
    return null;
  }

  const token = cookieToken.slice(`${AUTH_COOKIE_NAME}=`.length);
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export function getAuthCookieOptions(expiresAtMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAtMs),
  };
}
