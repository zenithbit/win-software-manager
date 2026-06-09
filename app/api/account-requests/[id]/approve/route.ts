import { initDb } from "@/lib/postgres";
import { approveRequest, getRequests } from "@/lib/accountRequestsDb";
import { createUser } from "@/lib/usersDb";
import { generateCredentials } from "@/lib/generateCredentials";
import type { UserDuration } from "@/lib/usersDb";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;

  const all = await getRequests();
  const request = all.find((r) => r.id === id);
  if (!request) {
    return Response.json({ error: "Yêu cầu không tồn tại." }, { status: 404 });
  }
  if (request.status !== "pending") {
    return Response.json({ error: "Yêu cầu đã được xử lý." }, { status: 409 });
  }

  const { username, password } = generateCredentials();
  const validDurations: UserDuration[] = ["1d", "3d", "30d", "forever"];
  const duration: UserDuration = validDurations.includes(request.duration as UserDuration)
    ? (request.duration as UserDuration)
    : "30d";

  await createUser(username, password, "user", duration);
  const updated = await approveRequest(id, username, password);

  return Response.json(updated);
}
