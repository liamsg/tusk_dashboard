import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login
     * - /api/auth/login
     * - /_next (Next.js internals)
     * - /favicon.ico
     * - Static files (images, fonts, etc.)
     */
    "/((?!login|api/auth/login|_next|favicon\\.ico|.*\\..*).*)",
  ],
};
