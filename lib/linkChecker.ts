import { sql } from "./postgres";
import { getAll } from "./db";

export type LinkStatus = "ok" | "broken" | "error";

export interface LinkCheckResult {
  id: string;
  name: string;
  downloadUrl: string;
  status: LinkStatus;
  statusCode?: number;
  checkedAt: string;
}

export interface LinkCheckReport {
  lastChecked: string;
  results: LinkCheckResult[];
}

const TIMEOUT_MS = 15_000;
const BATCH_SIZE = 5;

export async function getResults(): Promise<LinkCheckReport | null> {
  const rows = await sql`SELECT last_checked, results FROM link_check_report WHERE id = 'singleton'`;
  if (rows.length === 0) return null;
  return {
    lastChecked: (rows[0].last_checked as Date).toISOString(),
    results: rows[0].results as LinkCheckResult[],
  };
}

async function writeResults(report: LinkCheckReport): Promise<void> {
  await sql`
    INSERT INTO link_check_report (id, last_checked, results)
    VALUES ('singleton', ${report.lastChecked}, ${JSON.stringify(report.results)})
    ON CONFLICT (id) DO UPDATE SET last_checked = ${report.lastChecked}, results = ${JSON.stringify(report.results)}
  `;
}

async function checkSingleLink(url: string): Promise<{ status: LinkStatus; statusCode?: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    if (res.status === 405) {
      res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: controller.signal,
        redirect: "follow",
      });
    }

    clearTimeout(timer);
    const ok = res.ok || res.status === 206;
    return { status: ok ? "ok" : "broken", statusCode: res.status };
  } catch {
    clearTimeout(timer);
    return { status: "error" };
  }
}

export async function runCheck(): Promise<LinkCheckReport> {
  const items = await getAll();
  const now = new Date().toISOString();
  const results: LinkCheckResult[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const { status, statusCode } = await checkSingleLink(item.downloadUrl);
        return {
          id: item.id,
          name: item.name,
          downloadUrl: item.downloadUrl,
          status,
          statusCode,
          checkedAt: new Date().toISOString(),
        } satisfies LinkCheckResult;
      })
    );
    results.push(...batchResults);
  }

  const report: LinkCheckReport = { lastChecked: now, results };
  await writeResults(report);
  return report;
}
