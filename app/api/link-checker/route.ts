import { getResults, runCheck } from "@/lib/linkChecker";

export async function GET() {
  const report = await getResults();
  if (!report) return Response.json({ lastChecked: null, results: [] });
  return Response.json(report);
}

export async function POST() {
  try {
    const report = await runCheck();
    return Response.json(report);
  } catch {
    return Response.json({ error: "Lỗi khi kiểm tra link" }, { status: 500 });
  }
}
