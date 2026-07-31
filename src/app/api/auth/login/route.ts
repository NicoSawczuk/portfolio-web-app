import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  createSessionPayload,
  createSessionToken,
  getAuthCookieOptions,
  isUserActive,
  normalizeEmail,
  verifyPassword,
} from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { findUserByEmail, mapUserDocumentToPublic } from "@/lib/user-db";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = consumeRateLimit({
    namespace: "auth-login",
    identifier: ip,
    limit: 3,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Hubo un error, por favor intentá más tarde",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const body = await request.json();
  const { email, password } = body as {
    email?: string;
    password?: string;
  };

  if (!email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Email y password son obligatorios." }, { status: 400 });
  }

  const user = await findUserByEmail(normalizeEmail(email));
  if (!user) {
    return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
  }

  const passwordOk = await verifyPassword(password, user.password);
  if (!passwordOk) {
    return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
  }

  if (!isUserActive(user.expiration_date)) {
    return NextResponse.json({ error: "Hubo un error, por favor intentá más tarde" }, { status: 403 });
  }

  const publicUser = mapUserDocumentToPublic(user);
  const sessionPayload = createSessionPayload(publicUser);
  const sessionToken = createSessionToken(sessionPayload);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, sessionToken, getAuthCookieOptions(sessionPayload.sessionExpiresAt));

  return NextResponse.json({ user: publicUser });
}
