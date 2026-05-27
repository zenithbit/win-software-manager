import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "./usersDb";

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
}

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret()) as Promise<string>;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/** Extract token from Authorization header or wsm-token cookie */
export function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)wsm-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Build a Set-Cookie header value for the JWT */
export function buildTokenCookie(token: string, maxAge = 7 * 24 * 60 * 60): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `wsm-token=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/${secure}; Max-Age=${maxAge}`;
}

/** Build a clearing cookie (logout) */
export function clearTokenCookie(): string {
  return `wsm-token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
