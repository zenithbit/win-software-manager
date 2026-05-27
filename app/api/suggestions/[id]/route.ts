import { removeSuggestion } from "@/lib/suggestionsDb";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/suggestions/[id]">) {
  const { id } = await ctx.params;
  const ok = await removeSuggestion(id);
  if (!ok) return Response.json({ error: "Không tìm thấy" }, { status: 404 });
  return new Response(null, { status: 204 });
}
