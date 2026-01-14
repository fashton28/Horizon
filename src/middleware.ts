import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");
  const isHomePage = request.nextUrl.pathname === "/";

  // Allow API auth routes to pass through
  if (isApiAuth) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login (except auth pages and home)
  if (!sessionCookie && !isAuthPage && !isHomePage) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/meeting/:path*", "/auth/:path*"],
};
