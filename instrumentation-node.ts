import { initDb } from "./lib/postgres";
import { runCheck } from "./lib/linkChecker";
import { releaseStaleLogins } from "./lib/usersDb";

const INTERVAL_MS =
  parseInt(process.env.LINK_CHECK_INTERVAL_MS ?? "", 10) || 6 * 60 * 60 * 1000;

async function scheduledCheck() {
  try {
    console.log("[LinkChecker] Bắt đầu kiểm tra link...");
    const report = await runCheck();
    const broken = report.results.filter((r) => r.status === "broken");
    const errored = report.results.filter((r) => r.status === "error");

    if (broken.length > 0) {
      console.warn(
        `[LinkChecker] ⚠️  ${broken.length} link lỗi 404/5xx:\n` +
          broken.map((r) => `  - ${r.name}: ${r.downloadUrl} [${r.statusCode ?? "?"}]`).join("\n")
      );
    }
    if (errored.length > 0) {
      console.warn(
        `[LinkChecker] ⚠️  ${errored.length} link không thể kết nối:\n` +
          errored.map((r) => `  - ${r.name}: ${r.downloadUrl}`).join("\n")
      );
    }
    if (broken.length === 0 && errored.length === 0) {
      console.log(`[LinkChecker] ✓ Tất cả ${report.results.length} link đang hoạt động.`);
    }
  } catch (err) {
    console.error("[LinkChecker] Lỗi khi kiểm tra:", err);
  }
}

async function releaseStale() {
  try {
    const n = await releaseStaleLogins();
    if (n > 0) console.log(`[SessionGC] Giải phóng ${n} phiên không hoạt động quá 2 giờ.`);
  } catch (err) {
    console.error("[SessionGC] Lỗi:", err);
  }
}

const STALE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes

export async function init() {
  await initDb();
  console.log("[DB] Schema initialized.");
  setTimeout(scheduledCheck, 30_000);
  setInterval(scheduledCheck, INTERVAL_MS);
  setTimeout(releaseStale, 60_000); // first pass 1 min after startup
  setInterval(releaseStale, STALE_CHECK_INTERVAL_MS);
}
