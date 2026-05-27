import { sql } from "./postgres";

export interface Suggestion {
  id: string;
  name: string;
  downloadUrl?: string;
  note?: string;
  submittedAt: string;
}

function rowToSuggestion(row: Record<string, unknown>): Suggestion {
  return {
    id: row.id as string,
    name: row.name as string,
    downloadUrl: (row.download_url as string) ?? undefined,
    note: (row.note as string) ?? undefined,
    submittedAt: (row.submitted_at as Date).toISOString(),
  };
}

export async function getSuggestions(): Promise<Suggestion[]> {
  const rows = await sql`SELECT * FROM suggestions ORDER BY submitted_at DESC`;
  return rows.map(rowToSuggestion);
}

export async function addSuggestion(data: Omit<Suggestion, "id" | "submittedAt">): Promise<Suggestion> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rows = await sql`
    INSERT INTO suggestions (id, name, download_url, note)
    VALUES (${id}, ${data.name}, ${data.downloadUrl ?? null}, ${data.note ?? null})
    RETURNING *
  `;
  return rowToSuggestion(rows[0]);
}

export async function removeSuggestion(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM suggestions WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}
