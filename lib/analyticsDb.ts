import { sql } from "./postgres";

export type Analytics = Record<string, number>;

export async function getAnalytics(): Promise<Analytics> {
  const rows = await sql`SELECT software_id, count FROM analytics`;
  const result: Analytics = {};
  for (const row of rows) result[row.software_id as string] = row.count as number;
  return result;
}

export async function incrementDownload(id: string): Promise<number> {
  const rows = await sql`
    INSERT INTO analytics (software_id, count) VALUES (${id}, 1)
    ON CONFLICT (software_id) DO UPDATE SET count = analytics.count + 1
    RETURNING count
  `;
  return rows[0].count as number;
}
