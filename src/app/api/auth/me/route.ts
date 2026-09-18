import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getUserPermissionActions } from "@/lib/user-permissions-db";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const permissions = await getUserPermissionActions(session.userId);

  return NextResponse.json({
    userId: session.userId,
    email: session.email,
    name: session.name,
    userExpiresAt: session.userExpiresAt,
    sessionExpiresAt: session.sessionExpiresAt,
    permissions,
  });
}
