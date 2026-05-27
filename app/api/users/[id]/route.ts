import { updateUser, deleteUser } from "@/lib/usersDb";
import type { UserRole } from "@/lib/usersDb";

export async function PUT(req: Request, ctx: RouteContext<"/api/users/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    role?: UserRole;
    currentIp?: string | null;
    isLogin?: boolean;
    password?: string;
    maxDownloads?: number;
    downloadCount?: number;
  };
  const updated = await updateUser(id, body);
  if (!updated) return Response.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/users/[id]">) {
  const { id } = await ctx.params;
  const ok = await deleteUser(id);
  if (!ok) return Response.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  return new Response(null, { status: 204 });
}
