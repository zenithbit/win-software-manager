import { sql } from "./postgres";
import type { Software } from "@/app/data/software";

function rowToSoftware(row: Record<string, unknown>): Software {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    downloadUrl: row.download_url as string,
    category: row.category as string,
    icon: row.icon as string,
    tags: (row.tags as string[]) ?? [],
    wingetId: (row.winget_id as string) ?? undefined,
  };
}

export async function getAll(): Promise<Software[]> {
  const rows = await sql`SELECT * FROM software ORDER BY name ASC`;
  return rows.map(rowToSoftware);
}

export async function create(data: Omit<Software, "id">): Promise<Software> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rows = await sql`
    INSERT INTO software (id, name, description, download_url, category, icon, tags, winget_id)
    VALUES (${id}, ${data.name}, ${data.description}, ${data.downloadUrl},
            ${data.category}, ${data.icon}, ${data.tags ?? []}, ${data.wingetId ?? null})
    RETURNING *
  `;
  return rowToSoftware(rows[0]);
}

export async function update(id: string, data: Partial<Omit<Software, "id">>): Promise<Software | null> {
  const existing = await sql`SELECT * FROM software WHERE id = ${id}`;
  if (existing.length === 0) return null;
  const cur = rowToSoftware(existing[0]);
  const merged = { ...cur, ...data };
  const rows = await sql`
    UPDATE software
    SET name         = ${merged.name},
        description  = ${merged.description},
        download_url = ${merged.downloadUrl},
        category     = ${merged.category},
        icon         = ${merged.icon},
        tags         = ${merged.tags ?? []},
        winget_id    = ${merged.wingetId ?? null}
    WHERE id = ${id}
    RETURNING *
  `;
  return rowToSoftware(rows[0]);
}

export async function remove(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM software WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}
