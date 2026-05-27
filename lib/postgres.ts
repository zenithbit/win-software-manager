import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS software (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      description  TEXT NOT NULL,
      download_url TEXT NOT NULL,
      category     TEXT NOT NULL,
      icon         TEXT NOT NULL,
      tags         TEXT[] NOT NULL DEFAULT '{}',
      winget_id    TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      name       TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS suggestions (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      download_url TEXT,
      note         TEXT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS analytics (
      software_id TEXT PRIMARY KEY,
      count       INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS changelog (
      id            TEXT PRIMARY KEY,
      action        TEXT NOT NULL,
      software_name TEXT NOT NULL,
      software_id   TEXT NOT NULL,
      category      TEXT,
      timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS link_check_report (
      id           TEXT PRIMARY KEY DEFAULT 'singleton',
      last_checked TIMESTAMPTZ,
      results      JSONB NOT NULL DEFAULT '[]'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      current_ip    TEXT,
      is_login      BOOLEAN NOT NULL DEFAULT FALSE,
      expired_at    TIMESTAMPTZ,
      last_activity TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS max_downloads INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0`;
  await sql`
    CREATE TABLE IF NOT EXISTS download_log (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      username      TEXT NOT NULL,
      software_id   TEXT NOT NULL,
      software_name TEXT NOT NULL,
      downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address    TEXT
    )
  `;

  // Seed default categories on first run
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM categories`;
  if (count === 0) {
    const defaults = ["System", "Office", "Browsers", "Dev Tools", "Media", "Utilities"];
    for (let i = 0; i < defaults.length; i++) {
      await sql`
        INSERT INTO categories (name, sort_order) VALUES (${defaults[i]}, ${i})
        ON CONFLICT DO NOTHING
      `;
    }
  }
}
