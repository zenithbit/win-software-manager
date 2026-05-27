import type { NextRequest } from "next/server";
import { getSuggestions, addSuggestion } from "@/lib/suggestionsDb";

export async function GET() {
  return Response.json(await getSuggestions());
}

export async function POST(req: NextRequest) {
  const { name, downloadUrl, note } = (await req.json()) as {
    name?: string;
    downloadUrl?: string;
    note?: string;
  };
  if (!name?.trim()) {
    return Response.json({ error: "Tên phần mềm là bắt buộc" }, { status: 400 });
  }
  const item = await addSuggestion({
    name: name.trim(),
    downloadUrl: downloadUrl?.trim() || undefined,
    note: note?.trim() || undefined,
  });
  return Response.json(item, { status: 201 });
}
