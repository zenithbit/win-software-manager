import { sql } from "./postgres";

export interface DownloadLogEntry {
  id: string;
  userId: string;
  username: string;
  softwareId: string;
  softwareName: string;
  downloadedAt: string;
  ipAddress: string | null;
}

export async function logDownload(entry: Omit<DownloadLogEntry, "downloadedAt">): Promise<void> {
  await sql`
    INSERT INTO download_log (id, user_id, username, software_id, software_name, ip_address)
    VALUES (${entry.id}, ${entry.userId}, ${entry.username}, ${entry.softwareId}, ${entry.softwareName}, ${entry.ipAddress ?? null})
  `;
}

export async function getAllDownloadLogs(): Promise<DownloadLogEntry[]> {
  const rows = await sql`
    SELECT id, user_id, username, software_id, software_name, downloaded_at, ip_address
    FROM download_log
    ORDER BY downloaded_at DESC
    LIMIT 500
  `;
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    username: r.username as string,
    softwareId: r.software_id as string,
    softwareName: r.software_name as string,
    downloadedAt: (r.downloaded_at as Date).toISOString(),
    ipAddress: r.ip_address as string | null,
  }));
}
