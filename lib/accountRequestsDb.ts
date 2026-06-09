import { sql } from "./postgres";

export type RequestStatus = "pending" | "approved" | "declined";

export interface AccountRequest {
  id: string;
  name: string;
  ipAddress: string;
  location: string | null;
  duration: string;
  status: RequestStatus;
  declineReason: string | null;
  genUsername: string | null;
  genPassword: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

function rowToRequest(row: Record<string, unknown>): AccountRequest {
  return {
    id: row.id as string,
    name: row.name as string,
    ipAddress: row.ip_address as string,
    location: (row.location as string) ?? null,
    duration: row.duration as string,
    status: row.status as RequestStatus,
    declineReason: (row.decline_reason as string) ?? null,
    genUsername: (row.gen_username as string) ?? null,
    genPassword: (row.gen_password as string) ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    resolvedAt: row.resolved_at ? (row.resolved_at as Date).toISOString() : null,
  };
}

export async function getRequests(): Promise<AccountRequest[]> {
  const rows = await sql`SELECT * FROM account_requests ORDER BY created_at DESC`;
  return rows.map(rowToRequest);
}

export async function getRequestByIp(ip: string): Promise<AccountRequest | null> {
  const rows = await sql`SELECT * FROM account_requests WHERE ip_address = ${ip}`;
  return rows.length > 0 ? rowToRequest(rows[0]) : null;
}

export async function createRequest(
  name: string,
  ipAddress: string,
  location: string | null,
  duration: string
): Promise<AccountRequest> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rows = await sql`
    INSERT INTO account_requests (id, name, ip_address, location, duration)
    VALUES (${id}, ${name}, ${ipAddress}, ${location}, ${duration})
    RETURNING *
  `;
  return rowToRequest(rows[0]);
}

export async function approveRequest(
  id: string,
  username: string,
  password: string
): Promise<AccountRequest | null> {
  const rows = await sql`
    UPDATE account_requests
    SET status = 'approved', gen_username = ${username}, gen_password = ${password}, resolved_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length > 0 ? rowToRequest(rows[0]) : null;
}

export async function declineRequest(id: string, reason: string): Promise<AccountRequest | null> {
  const rows = await sql`
    UPDATE account_requests
    SET status = 'declined', decline_reason = ${reason}, resolved_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length > 0 ? rowToRequest(rows[0]) : null;
}
