import { initDb } from "@/lib/postgres";
import { getRequests, getRequestByIp, createRequest } from "@/lib/accountRequestsDb";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function getLocation(ip: string): Promise<string | null> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Mạng nội bộ";
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { city?: string; regionName?: string; country?: string };
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

export async function GET() {
  await initDb();
  return Response.json(await getRequests());
}

export async function POST(req: Request) {
  await initDb();
  const body = (await req.json()) as { name?: string; duration?: string };
  const name = body.name?.trim();
  const duration = body.duration?.trim() ?? "30d";

  if (!name) {
    return Response.json({ error: "Vui lòng nhập tên." }, { status: 400 });
  }

  const validDurations = ["1d", "3d", "30d", "forever"];
  if (!validDurations.includes(duration)) {
    return Response.json({ error: "Thời hạn không hợp lệ." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const existing = await getRequestByIp(ip);
  if (existing) {
    return Response.json({ error: "IP này đã có yêu cầu tài khoản.", existing }, { status: 409 });
  }

  const location = await getLocation(ip);
  const request = await createRequest(name, ip, location, duration);
  return Response.json(request, { status: 201 });
}
