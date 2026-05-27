import { updateUser } from "@/lib/usersDb";

export async function POST(_req: Request, ctx: RouteContext<"/api/users/[id]/kick">) {
  const { id } = await ctx.params;
  const updated = await updateUser(id, { isLogin: false, currentIp: null });
  if (!updated) return Response.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  return new Response(null, { status: 204 });
}
