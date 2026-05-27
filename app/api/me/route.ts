import { extractToken, verifyToken } from "@/lib/jwt";
import { getUserById, touchActivity } from "@/lib/usersDb";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return Response.json({ user: null }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return Response.json({ user: null }, { status: 401 });

  const user = await getUserById(payload.userId);
  if (!user) return Response.json({ user: null }, { status: 401 });

  // Keep session alive — update last_activity each time the app loads
  if (user.isLogin) await touchActivity(user.id);

  return Response.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      maxDownloads: user.maxDownloads,
      downloadCount: user.downloadCount,
    },
  });
}
