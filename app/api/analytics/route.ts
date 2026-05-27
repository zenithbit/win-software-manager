import { getAnalytics } from "@/lib/analyticsDb";

export async function GET() {
  return Response.json(await getAnalytics());
}
