import { sql } from "./postgres";

export async function getCategories(): Promise<string[]> {
  const rows = await sql`SELECT name FROM categories ORDER BY sort_order ASC, name ASC`;
  return rows.map((r) => r.name as string);
}

export async function addCategory(name: string): Promise<string[]> {
  const [{ max }] = await sql`SELECT COALESCE(MAX(sort_order), -1)::int AS max FROM categories`;
  await sql`
    INSERT INTO categories (name, sort_order) VALUES (${name}, ${max + 1})
    ON CONFLICT DO NOTHING
  `;
  return getCategories();
}

export async function removeCategory(name: string): Promise<{ ok: boolean; reason?: string }> {
  const result = await sql`DELETE FROM categories WHERE name = ${name} RETURNING name`;
  if (result.length === 0) return { ok: false, reason: "Không tìm thấy danh mục" };
  return { ok: true };
}
