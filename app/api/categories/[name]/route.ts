import { getAll } from "@/lib/db";
import { removeCategory } from "@/lib/categoriesDb";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/categories/[name]">) {
  const { name } = await ctx.params;
  const decoded = decodeURIComponent(name);

  const items = await getAll();
  if (items.some((s) => s.category === decoded)) {
    return Response.json({ error: "Danh mục đang được sử dụng, không thể xóa" }, { status: 409 });
  }

  const result = await removeCategory(decoded);
  if (!result.ok) return Response.json({ error: result.reason }, { status: 404 });
  return new Response(null, { status: 204 });
}
