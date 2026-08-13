import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  return NextResponse.json({
    userId: session.userId,
    email: session.email,
    name: session.name,
    userExpiresAt: session.userExpiresAt,
    sessionExpiresAt: session.sessionExpiresAt,
  });
}
