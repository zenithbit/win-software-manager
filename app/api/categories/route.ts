import type { NextRequest } from "next/server";
import { getCategories, addCategory } from "@/lib/categoriesDb";

export async function GET() {
  return Response.json(await getCategories());
}

export async function POST(req: NextRequest) {
  const { name } = (await req.json()) as { name?: string };
  const trimmed = name?.trim();
  if (!trimmed) return Response.json({ error: "Tên danh mục không được để trống" }, { status: 400 });
  const cats = await addCategory(trimmed);
  return Response.json(cats, { status: 201 });
}
