import { extractToken, verifyToken } from "@/lib/jwt";
import { initDb } from "@/lib/postgres";
import { logDownload, getAllDownloadLogs } from "@/lib/downloadLogDb";
import { getUserById, incrementDownloadCount } from "@/lib/usersDb";

function getClientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const softwareId: string = body?.softwareId;
  const softwareName: string = body?.softwareName;

  if (!softwareId || !softwareName) {
    return Response.json({ error: "softwareId and softwareName are required" }, { status: 400 });
  }

  await initDb();

  // Quota check — admins are always exempt
  if (payload.role !== "admin") {
    const user = await getUserById(payload.userId);
    if (user && user.maxDownloads > 0 && user.downloadCount >= user.maxDownloads) {
      return Response.json(
        { error: "quota_exceeded", remaining: 0 },
        { status: 403 }
      );
    }
  }

  await logDownload({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    userId: payload.userId,
    username: payload.username,
    softwareId,
    softwareName,
    ipAddress: getClientIp(req),
  });

  const newCount = payload.role !== "admin"
    ? await incrementDownloadCount(payload.userId)
    : 0;

  return Response.json({ ok: true, downloadCount: newCount }, { status: 201 });
}

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await initDb();
  const logs = await getAllDownloadLogs();
  return Response.json(logs);
}
