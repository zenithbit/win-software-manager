import { getUserByUsername, verifyPassword, updateUser, isExpired, isSessionStale, touchActivity } from "@/lib/usersDb";
import { signToken, buildTokenCookie } from "@/lib/jwt";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  const body = (await req.json()) as { username?: string; password?: string };
  const username = body.username?.trim();
  const password = body.password?.trim();

  if (!username || !password) {
    return Response.json({ error: "Vui lòng nhập tên đăng nhập và mật khẩu." }, { status: 400 });
  }

  // 1. Find user
  const user = await getUserByUsername(username);
  if (!user) {
    return Response.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401 });
  }

  // 2. Verify password
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401 });
  }

  // 3. Expiration check
  if (isExpired(user)) {
    return Response.json({ error: "Tài khoản đã hết hạn!" }, { status: 403 });
  }

  // 4. Auto-release stale session (idle > 2 hours)
  const requestIp = getClientIp(req);
  let effectiveIsLogin = user.isLogin;
  let effectiveIp = user.currentIp;
  if (isSessionStale(user)) {
    await updateUser(user.id, { isLogin: false, currentIp: null });
    effectiveIsLogin = false;
    effectiveIp = null;
  }

  // 5. Device / session check
  if (effectiveIsLogin && effectiveIp !== requestIp) {
    return Response.json(
      { error: "Tài khoản đang được sử dụng trên một thiết bị khác!" },
      { status: 403 }
    );
  }

  // 6. Allow login — update IP + status + last_activity
  await updateUser(user.id, { currentIp: requestIp, isLogin: true });
  await touchActivity(user.id);

  // 7. Sign JWT
  const token = await signToken({ userId: user.id, username: user.username, role: user.role });

  return Response.json(
    { token, user: { id: user.id, username: user.username, role: user.role } },
    {
      status: 200,
      headers: { "Set-Cookie": buildTokenCookie(token) },
    }
  );
}
