import { initDb } from "@/lib/postgres";
import { declineRequest, getRequests } from "@/lib/accountRequestsDb";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = (await req.json()) as { reason?: string };
  const reason = body.reason?.trim();

  if (!reason) {
    return Response.json({ error: "Vui lòng chọn lý do từ chối." }, { status: 400 });
  }

  const all = await getRequests();
  const request = all.find((r) => r.id === id);
  if (!request) {
    return Response.json({ error: "Yêu cầu không tồn tại." }, { status: 404 });
  }
  if (request.status !== "pending") {
    return Response.json({ error: "Yêu cầu đã được xử lý." }, { status: 409 });
  }

  const updated = await declineRequest(id, reason);
  return Response.json(updated);
}
