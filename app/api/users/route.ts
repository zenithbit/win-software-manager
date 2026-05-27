import { getUsers, createUser } from "@/lib/usersDb";
import { generateCredentials } from "@/lib/generateCredentials";
import type { UserRole, UserDuration } from "@/lib/usersDb";

export async function GET() {
  return Response.json(await getUsers());
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    username?: string;
    password?: string;
    role?: UserRole;
    duration?: UserDuration;
  };

  const creds = generateCredentials();
  const username = body.username?.trim() || creds.username;
  const password = body.password?.trim() || creds.password;
  const role: UserRole = body.role === "admin" ? "admin" : "user";
  const duration: UserDuration = ["1d", "3d", "30d", "forever"].includes(body.duration ?? "")
    ? (body.duration as UserDuration)
    : "forever";

  try {
    const user = await createUser(username, password, role, duration);
    return Response.json({ user, credentials: { username, password } }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return Response.json({ error: "Username đã tồn tại, thử lại." }, { status: 409 });
    }
    return Response.json({ error: "Không thể tạo tài khoản." }, { status: 500 });
  }
}
