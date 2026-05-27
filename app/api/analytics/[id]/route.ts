import { incrementDownload } from "@/lib/analyticsDb";

export async function POST(_req: Request, ctx: RouteContext<"/api/analytics/[id]">) {
  const { id } = await ctx.params;
  const count = await incrementDownload(id);
  return Response.json({ id, count });
}
