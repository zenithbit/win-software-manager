import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { sql } from "./postgres";

const scryptAsync = promisify(scrypt);

export type UserRole = "admin" | "user";
export type UserDuration = "1d" | "3d" | "30d" | "forever";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  currentIp: string | null;
  isLogin: boolean;
  expiredAt: string | null;
  lastActivity: string | null;
  createdAt: string;
  maxDownloads: number;
  downloadCount: number;
}

/** Safe version — never exposes passwordHash */
export type SafeUser = Omit<User, "passwordHash">;

function toExpiredAt(duration: UserDuration): Date | null {
  if (duration === "forever") return null;
  const days = duration === "1d" ? 1 : duration === "3d" ? 3 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    passwordHash: row.password_hash as string,
    role: row.role as UserRole,
    currentIp: (row.current_ip as string) ?? null,
    isLogin: row.is_login as boolean,
    expiredAt: row.expired_at ? (row.expired_at as Date).toISOString() : null,
    lastActivity: row.last_activity ? (row.last_activity as Date).toISOString() : null,
    createdAt: (row.created_at as Date).toISOString(),
    maxDownloads: (row.max_downloads as number) ?? 0,
    downloadCount: (row.download_count as number) ?? 0,
  };
}

/** True when isLogin=true but last_activity is older than 2 hours (or never set). */
export function isSessionStale(user: User | SafeUser): boolean {
  if (!user.isLogin) return false;
  if (!user.lastActivity) return true; // logged in but no activity recorded → treat as stale
  return Date.now() - new Date(user.lastActivity).getTime() > STALE_MS;
}

function toSafe(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function isExpired(user: User | SafeUser): boolean {
  if (!user.expiredAt) return false;
  return new Date(user.expiredAt) < new Date();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuf, derived);
}

export async function getUsers(): Promise<SafeUser[]> {
  const rows = await sql`SELECT * FROM users ORDER BY created_at ASC`;
  return rows.map((r) => toSafe(rowToUser(r)));
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE username = ${username}`;
  return rows.length > 0 ? rowToUser(rows[0]) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows.length > 0 ? rowToUser(rows[0]) : null;
}

export async function createUser(
  username: string,
  password: string,
  role: UserRole = "user",
  duration: UserDuration = "forever"
): Promise<SafeUser> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const passwordHash = await hashPassword(password);
  const expiredAt = toExpiredAt(duration);
  const rows = await sql`
    INSERT INTO users (id, username, password_hash, role, expired_at)
    VALUES (${id}, ${username}, ${passwordHash}, ${role}, ${expiredAt})
    RETURNING *
  `;
  return toSafe(rowToUser(rows[0]));
}

export async function updateUser(
  id: string,
  data: Partial<{
    role: UserRole;
    currentIp: string | null;
    isLogin: boolean;
    password: string;
    expiredAt: string | null;
    maxDownloads: number;
    downloadCount: number;
  }>
): Promise<SafeUser | null> {
  const existing = await sql`SELECT * FROM users WHERE id = ${id}`;
  if (existing.length === 0) return null;
  const cur = rowToUser(existing[0]);

  const newHash = data.password ? await hashPassword(data.password) : cur.passwordHash;
  const newExpiredAt = data.expiredAt !== undefined ? data.expiredAt : cur.expiredAt;
  const newMaxDownloads = data.maxDownloads !== undefined ? data.maxDownloads : cur.maxDownloads;
  const newDownloadCount = data.downloadCount !== undefined ? data.downloadCount : cur.downloadCount;
  const rows = await sql`
    UPDATE users
    SET role           = ${data.role ?? cur.role},
        current_ip     = ${data.currentIp !== undefined ? data.currentIp : cur.currentIp},
        is_login       = ${data.isLogin !== undefined ? data.isLogin : cur.isLogin},
        password_hash  = ${newHash},
        expired_at     = ${newExpiredAt},
        max_downloads  = ${newMaxDownloads},
        download_count = ${newDownloadCount}
    WHERE id = ${id}
    RETURNING *
  `;
  return toSafe(rowToUser(rows[0]));
}

export async function incrementDownloadCount(id: string): Promise<number> {
  const rows = await sql`
    UPDATE users
    SET download_count = download_count + 1
    WHERE id = ${id}
    RETURNING download_count
  `;
  return rows.length > 0 ? (rows[0].download_count as number) : 0;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}

/** Update last_activity to now for a logged-in user. */
export async function touchActivity(id: string): Promise<void> {
  await sql`UPDATE users SET last_activity = NOW() WHERE id = ${id}`;
}

/**
 * Auto-release all sessions idle for more than 2 hours.
 * Returns the number of sessions released.
 */
export async function releaseStaleLogins(): Promise<number> {
  const rows = await sql`
    UPDATE users
    SET is_login = false, current_ip = null
    WHERE is_login = true
      AND (
        last_activity IS NULL
        OR last_activity < NOW() - INTERVAL '2 hours'
      )
    RETURNING id
  `;
  return rows.length;
}
