import type { NextRequest } from "next/server";
import { update, remove } from "@/lib/db";

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/software/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const updated = await update(id, body);
  if (!updated) return Response.json({ error: "Không tìm thấy" }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/software/[id]">) {
  const { id } = await ctx.params;
  const ok = await remove(id);
  if (!ok) return Response.json({ error: "Không tìm thấy" }, { status: 404 });
  return new Response(null, { status: 204 });
}
