import { updateUser, getUserById } from "@/lib/usersDb";
import { extractToken, verifyToken, clearTokenCookie } from "@/lib/jwt";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) {
    return Response.json({ error: "Không tìm thấy phiên đăng nhập." }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    // Token invalid or expired — clear cookie anyway
    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": clearTokenCookie() },
    });
  }

  const user = await getUserById(payload.userId);
  if (user) {
    await updateUser(user.id, { currentIp: null, isLogin: false });
  }

  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearTokenCookie() },
  });
}
