import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

const sql = neon(
  "postgresql://neondb_owner:npg_GADpX3quKfk0@ep-rough-tooth-aoxmzb6s-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
);

interface Software {
  id: string;
  name: string;
  description: string;
  downloadUrl: string;
  category: string;
  icon: string;
  tags?: string[];
  wingetId?: string;
}

async function migrate() {
  // --- Ensure tables exist ---
  await sql`CREATE TABLE IF NOT EXISTS software (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
    download_url TEXT NOT NULL, category TEXT NOT NULL, icon TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}', winget_id TEXT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY, sort_order INTEGER NOT NULL DEFAULT 0
  )`;

  // --- Migrate categories ---
  const cats: string[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "categories.json"), "utf-8")
  );

  for (let i = 0; i < cats.length; i++) {
    await sql`
      INSERT INTO categories (name, sort_order) VALUES (${cats[i]}, ${i})
      ON CONFLICT (name) DO NOTHING
    `;
  }
  console.log(`✓ Categories: ${cats.join(", ")}`);

  // --- Migrate software ---
  const items: Software[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "software-db.json"), "utf-8")
  );

  let inserted = 0;
  let skipped = 0;

  for (const s of items) {
    const result = await sql`
      INSERT INTO software (id, name, description, download_url, category, icon, tags, winget_id)
      VALUES (
        ${s.id}, ${s.name}, ${s.description}, ${s.downloadUrl},
        ${s.category}, ${s.icon}, ${s.tags ?? []}, ${s.wingetId ?? null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    if (result.length === 0) {
      skipped++;
      console.log(`  skip  ${s.name}`);
    } else {
      inserted++;
      console.log(`  added ${s.name}`);
    }
  }

  console.log(`\n✓ Done: ${inserted} inserted, ${skipped} skipped.`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
