import { getChangelog, addChangelogEntry } from "@/lib/changelogDb";

export async function GET() {
  return Response.json(await getChangelog());
}

export async function POST(req: Request) {
  const body = await req.json();
  const entry = await addChangelogEntry(body);
  return Response.json(entry, { status: 201 });
}
