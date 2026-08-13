import { NextResponse } from "next/server";
import {
  normalizeEmail,
} from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { createUser, findUserByEmail } from "@/lib/user-db";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = consumeRateLimit({
    namespace: "auth-register",
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
  const { email, name, password } = body as {
    email?: string;
    name?: string;
    password?: string;
  };

  if (!email?.trim() || !name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Debes enviar email, name y password." }, { status: 400 });
  }

  if (password.trim().length < 8) {
    return NextResponse.json({ error: "La password debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const createdUser = await createUser({
    email: normalizedEmail,
    name,
    password: password.trim(),
    expirationDateIso: oneDayAgo,
  });

  return NextResponse.json(
    {
      user: createdUser,
      message:
        "Registro exitoso. Contactate con el administrador para activar la cuenta y luego iniciá sesión.",
    },
    { status: 201 }
  );
}
