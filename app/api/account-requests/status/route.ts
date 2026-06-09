import { initDb } from "@/lib/postgres";
import { getRequestByIp } from "@/lib/accountRequestsDb";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: Request) {
  await initDb();
  const ip = getClientIp(req);
  const request = await getRequestByIp(ip);
  if (!request) {
    return Response.json({ status: "none" });
  }
  return Response.json({
    status: request.status,
    declineReason: request.declineReason,
    genUsername: request.status === "approved" ? request.genUsername : undefined,
    genPassword: request.status === "approved" ? request.genPassword : undefined,
  });
}
