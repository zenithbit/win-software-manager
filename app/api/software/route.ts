import type { NextRequest } from "next/server";
import { getAll, create } from "@/lib/db";

export async function GET() {
  return Response.json(await getAll());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, downloadUrl, category, icon, tags, wingetId } = body as {
    name?: string;
    description?: string;
    downloadUrl?: string;
    category?: string;
    icon?: string;
    tags?: string[];
    wingetId?: string;
  };

  if (!name?.trim() || !description?.trim() || !downloadUrl?.trim() || !category?.trim() || !icon?.trim()) {
    return Response.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const item = await create({
    name: name.trim(),
    description: description.trim(),
    downloadUrl: downloadUrl.trim(),
    category: category.trim(),
    icon: icon.trim(),
    tags: tags ?? [],
    wingetId: wingetId?.trim() || undefined,
  });
  return Response.json(item, { status: 201 });
}
