import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

function isPublicPath(pathname: string) {
  if (pathname === "/login") {
    return true;
  }

  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/me"
  ) {
    return true;
  }

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (pathname === "/login" && session) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    if (isApiRoute) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
