import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("wsm-token")?.value;

  // Redirect logged-in users away from login page
  if (pathname === "/login") {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // All other pages require a valid token
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete("wsm-token");
    return res;
  }

  // /admin requires admin role
  if (pathname.startsWith("/admin") && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|logo).*)"],
};
