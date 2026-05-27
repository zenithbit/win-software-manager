import { sql } from "./postgres";
import { randomUUID } from "crypto";

export type ChangelogAction = "add" | "edit" | "delete";

export interface ChangelogEntry {
  id: string;
  action: ChangelogAction;
  softwareName: string;
  softwareId: string;
  category?: string;
  timestamp: string;
}

function rowToEntry(row: Record<string, unknown>): ChangelogEntry {
  return {
    id: row.id as string,
    action: row.action as ChangelogAction,
    softwareName: row.software_name as string,
    softwareId: row.software_id as string,
    category: (row.category as string) ?? undefined,
    timestamp: (row.timestamp as Date).toISOString(),
  };
}

export async function getChangelog(): Promise<ChangelogEntry[]> {
  const rows = await sql`SELECT * FROM changelog ORDER BY timestamp DESC LIMIT 300`;
  return rows.map(rowToEntry);
}

export async function addChangelogEntry(
  data: Omit<ChangelogEntry, "id" | "timestamp">
): Promise<ChangelogEntry> {
  const id = randomUUID();
  const rows = await sql`
    INSERT INTO changelog (id, action, software_name, software_id, category)
    VALUES (${id}, ${data.action}, ${data.softwareName}, ${data.softwareId}, ${data.category ?? null})
    RETURNING *
  `;
  return rowToEntry(rows[0]);
}
