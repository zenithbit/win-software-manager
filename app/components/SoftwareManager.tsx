"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { type Software } from "@/app/data/software";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import type { SafeUser } from "@/lib/usersDb";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_ICONS: Record<string, string> = {
  All: "🗂️", System: "⚙️", Office: "📁", Browsers: "🌐",
  "Dev Tools": "🛠️", Media: "🎬", Utilities: "✨",
};

const CAT_BUTTON_COLORS: Record<string, string> = {
  All: "bg-slate-600 text-white",
  System: "bg-blue-600 text-white",
  Office: "bg-emerald-600 text-white",
  Browsers: "bg-orange-500 text-white",
  "Dev Tools": "bg-purple-600 text-white",
  Media: "bg-rose-500 text-white",
  Utilities: "bg-amber-500 text-white",
};

const CAT_BADGE_COLORS: Record<string, string> = {
  System: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Office: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Browsers: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Dev Tools": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Media: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Utilities: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const FALLBACK_BUTTON = ["bg-cyan-600 text-white","bg-indigo-600 text-white","bg-pink-500 text-white","bg-teal-600 text-white","bg-violet-600 text-white","bg-lime-600 text-white"];
const FALLBACK_BADGE = ["bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300","bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300","bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300","bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300","bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300","bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300"];

function strHash(s: string) { return s.split("").reduce((a, c) => a + c.charCodeAt(0), 0); }
function getCatButtonColor(cat: string) { return CAT_BUTTON_COLORS[cat] ?? FALLBACK_BUTTON[strHash(cat) % FALLBACK_BUTTON.length]; }
function getCatBadgeColor(cat: string) { return CAT_BADGE_COLORS[cat] ?? FALLBACK_BADGE[strHash(cat) % FALLBACK_BADGE.length]; }
function getCatIcon(cat: string) { return CAT_ICONS[cat] ?? "📦"; }

const STORAGE_KEY = "wsm-installed";

// ─── Icons ────────────────────────────────────────────────────────────────────

function DownloadIcon({ size = 15 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function ScriptIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// ─── PopularIcon ──────────────────────────────────────────────────────────────

function PopularIcon({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  return err
    ? <span className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">{alt.charAt(0)}</span>
    : <img src={src} alt="" className="w-7 h-7 object-contain flex-shrink-0" onError={() => setErr(true)} />;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  software: Software;
  selected: boolean;
  installed: boolean;
  quotaExceeded: boolean;
  onToggle: (id: string) => void;
  onMark: (id: string) => void;
  onUnmark: (id: string) => void;
  onDownload: (id: string) => void;
}

function SoftwareCard({ software, selected, installed, quotaExceeded, onToggle, onMark, onUnmark, onDownload }: CardProps) {
  const [hoverBtn, setHoverBtn] = useState(false);
  const [iconError, setIconError] = useState(false);

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      onClick={() => onToggle(software.id)}
      className={`group relative flex flex-col rounded-2xl border-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer select-none ${
        selected
          ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/30"
          : installed
          ? "border-emerald-300 bg-emerald-50/20 hover:border-emerald-400 dark:border-emerald-700 dark:bg-emerald-900/20 dark:hover:border-emerald-600"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
      }`}
    >
      {/* Checkbox indicator */}
      <div
        className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
          selected
            ? "bg-blue-600 border-blue-600 text-white scale-100 opacity-100"
            : "bg-white border-slate-300 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 dark:bg-slate-700 dark:border-slate-500"
        }`}
      >
        {selected && <CheckIcon />}
      </div>

      {/* Installed badge */}
      {installed && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm pointer-events-none">
          <span>✓</span>
          <span>Đã cài</span>
        </div>
      )}

      {/* Body */}
      <div
        className={`flex items-start gap-4 p-5 flex-1 transition-all duration-150 ${
          selected ? "pl-10" : "pl-5 group-hover:pl-10"
        } ${installed ? "pr-16" : ""}`}
      >
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-700 dark:border-slate-600 overflow-hidden">
          {iconError ? (
            <span className="text-lg font-bold text-slate-400 dark:text-slate-500">{software.name.charAt(0)}</span>
          ) : (
            <img src={software.icon} alt="" className="w-10 h-10 object-contain" onError={() => setIconError(true)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight">{software.name}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCatBadgeColor(software.category)}`}>
              {software.category}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{software.description}</p>
        </div>
      </div>

      {/* Action button */}
      <div className="px-5 pb-5" onClick={(e) => e.stopPropagation()}>
        {installed ? (
          <button
            onMouseEnter={() => setHoverBtn(true)}
            onMouseLeave={() => setHoverBtn(false)}
            onClick={() => onUnmark(software.id)}
            title="Bấm để bỏ đánh dấu đã cài"
            className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium active:scale-[0.98] transition-all duration-150 ${
              hoverBtn ? "bg-red-500 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {hoverBtn ? <><UndoIcon />Bỏ đánh dấu</> : <><CheckCircleIcon />Đã cài đặt</>}
          </button>
        ) : quotaExceeded ? (
          <button
            disabled
            title="Bạn đã dùng hết lượt tải được cấp"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
          >
            <LockIcon />
            Hết lượt tải
          </button>
        ) : (
          <a
            href={software.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { onMark(software.id); onDownload(software.id); }}
            className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium active:scale-[0.98] transition-all duration-150 ${
              selected
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
            }`}
          >
            <DownloadIcon />
            Tải về
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Bulk Download Modal ──────────────────────────────────────────────────────

interface BulkModalProps {
  items: Software[];
  remaining: number;
  onRemove: (id: string) => void;
  onClose: () => void;
  onMarkAllInstalled: (ids: string[]) => void;
  onBulkDownload: (ids: string[]) => void;
}

type ScriptFormat = "bat" | "ps1";

function BulkDownloadModal({ items, remaining, onRemove, onClose, onMarkAllInstalled, onBulkDownload }: BulkModalProps) {
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const [markedAll, setMarkedAll] = useState(false);
  const [scriptFormat, setScriptFormat] = useState<ScriptFormat>("ps1");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptDone, setScriptDone] = useState(false);

  const wingetItems = items.filter((s) => s.wingetId);
  const noWinget = items.filter((s) => !s.wingetId);

  const openAllTabs = () => {
    items.forEach((s) => window.open(s.downloadUrl, "_blank", "noopener,noreferrer"));
    onBulkDownload(items.map((s) => s.id));
    setOpened(true);
  };

  const handleMarkAll = () => {
    onMarkAllInstalled(items.map((s) => s.id));
    setMarkedAll(true);
  };

  const copyAllLinks = async () => {
    const text = items.map((s) => `${s.name}: ${s.downloadUrl}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadScript = async () => {
    setGeneratingScript(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: wingetItems.map((s) => s.id), format: scriptFormat }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `install-software.${scriptFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setScriptDone(true);
      setTimeout(() => setScriptDone(false), 4000);
    } catch {
      alert("Không thể tạo script, vui lòng thử lại.");
    } finally {
      setGeneratingScript(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Tải hàng loạt</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{items.length} phần mềm đã chọn</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition">
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {items.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 group">
                <img src={s.icon} alt="" className="w-7 h-7 object-contain flex-shrink-0 rounded" onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{s.name}</p>
                    {s.wingetId ? (
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700" title={`winget ID: ${s.wingetId}`}>winget</span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded dark:bg-slate-700 dark:text-slate-500">no winget</span>
                    )}
                  </div>
                  <a
                    href={s.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 truncate flex items-center gap-1 transition"
                  >
                    <span className="truncate">{s.downloadUrl.replace(/^https?:\/\//, "")}</span>
                    <ExternalLinkIcon />
                  </a>
                </div>
                <button
                  onClick={() => onRemove(s.id)}
                  title="Bỏ chọn"
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 space-y-3 flex-shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
          {/* Quota warning */}
          {remaining === 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/50 px-3 py-2.5 text-xs font-medium text-red-700 dark:text-red-400">
              <LockIcon />
              Bạn đã dùng hết lượt tải được cấp. Liên hệ Admin để tăng giới hạn.
            </div>
          )}
          {remaining > 0 && remaining < items.length && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50 px-3 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              ⚠ Bạn còn {remaining} lượt tải, nhưng đang chọn {items.length} phần mềm.
            </div>
          )}
          {/* Open tabs */}
          <button
            onClick={openAllTabs}
            disabled={remaining === 0}
            className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
              opened ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {opened ? <>✓ Đã mở {items.length} tab — mở lại?</> : <><ExternalLinkIcon />Mở tất cả trong tab mới ({items.length} tab)</>}
          </button>

          {/* Mark all as installed */}
          {opened && (
            <button
              onClick={handleMarkAll}
              disabled={markedAll}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                markedAll
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 cursor-default dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white dark:text-emerald-400"
              }`}
            >
              <CheckCircleIcon />
              {markedAll ? `✓ Đã đánh dấu ${items.length} phần mềm là "Đã cài"` : `Đánh dấu ${items.length} phần mềm là "Đã cài"`}
            </button>
          )}

          {/* Copy links */}
          <button
            onClick={copyAllLinks}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100 transition dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <CopyIcon />
            {copied ? "✓ Đã sao chép tất cả link!" : "Sao chép tất cả link"}
          </button>

          <p className="text-xs text-slate-400 dark:text-slate-500 text-center leading-relaxed">
            ⚠️ Nếu trình duyệt chặn popup, hãy cho phép mở tab từ trang này và thử lại.
          </p>

          {/* Script section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ScriptIcon />
                  Script cài đặt tự động (winget)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {wingetItems.length}/{items.length} phần mềm hỗ trợ winget
                </p>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 text-xs font-semibold">
                {(["ps1", "bat"] as ScriptFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setScriptFormat(fmt)}
                    className={`px-3 py-1.5 transition ${
                      scriptFormat === fmt
                        ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                        : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                    }`}
                  >
                    .{fmt}
                  </button>
                ))}
              </div>
            </div>

            {noWinget.length > 0 && (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/50">
                ⚠ {noWinget.map((s) => s.name).join(", ")} không có winget ID — sẽ bị bỏ qua trong script.
              </p>
            )}

            {wingetItems.length > 0 ? (
              <button
                onClick={downloadScript}
                disabled={generatingScript}
                className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 text-sm font-bold transition ${
                  scriptDone
                    ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-400 dark:text-slate-200 dark:hover:bg-slate-200 dark:hover:text-slate-900"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {scriptDone ? (
                  <>✓ Đã tải install-software.{scriptFormat}</>
                ) : generatingScript ? (
                  <>Đang tạo script...</>
                ) : (
                  <><DownloadIcon size={14} />Tải script .{scriptFormat} ({wingetItems.length} phần mềm)</>
                )}
              </button>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                Không có phần mềm nào hỗ trợ winget trong danh sách đã chọn.
              </p>
            )}

            {scriptFormat === "ps1" && (
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Chuột phải → &ldquo;Run with PowerShell&rdquo; — hoặc xem hướng dẫn trong file nếu bị chặn ExecutionPolicy.
              </p>
            )}
            {scriptFormat === "bat" && (
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Chuột phải → &ldquo;Run as administrator&rdquo; để đạt kết quả tốt nhất.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Selection Bar ────────────────────────────────────────────────────────────

interface SelectionBarProps {
  count: number;
  total: number;
  onClear: () => void;
  onOpenModal: () => void;
}

function SelectionBar({ count, total, onClear, onOpenModal }: SelectionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t-2 border-blue-200 dark:border-blue-800 shadow-2xl shadow-slate-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white">
            <CheckIcon />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Đã chọn{" "}
            <span className="font-bold text-blue-600">{count}</span>
            <span className="text-slate-400">/{total}</span>
            {" "}phần mềm
          </span>
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2 transition whitespace-nowrap hidden sm:block"
          >
            Bỏ chọn tất cả
          </button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onClear}
            className="sm:hidden text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition px-2 py-1.5"
          >
            Bỏ chọn
          </button>
          <button
            onClick={onOpenModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-600/30"
          >
            <DownloadIcon size={14} />
            <span>Tải {count} phần mềm</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Suggestion Modal ─────────────────────────────────────────────────────────

function SuggestionModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, note }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Đề xuất phần mềm</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition text-lg">✕</button>
        </div>

        <div className="p-6">
          {status === "done" ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Cảm ơn bạn đã đề xuất!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Chúng tôi sẽ xem xét và thêm vào danh sách sớm nhất có thể.</p>
              <button onClick={onClose} className="mt-5 px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-600 text-white text-sm font-semibold hover:bg-slate-700 dark:hover:bg-slate-500 transition">Đóng</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Tên phần mềm *</label>
                <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: ShareX, Obsidian, Figma..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Ghi chú <span className="normal-case font-normal">(không bắt buộc)</span></label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tại sao phần mềm này hữu ích? Link tải nếu biết..." rows={3} className={`${inputCls} resize-none`} />
              </div>
              {status === "error" && <p className="text-xs text-red-500">Có lỗi xảy ra, vui lòng thử lại.</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={status === "loading"} className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-600 text-white text-sm font-semibold hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-60 transition">
                  {status === "loading" ? "Đang gửi..." : "Gửi đề xuất"}
                </button>
                <button type="button" onClick={onClose} className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition">Hủy</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── User Management Modal ────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: "1d",      label: "1 ngày" },
  { value: "3d",      label: "3 ngày" },
  { value: "30d",     label: "30 ngày" },
  { value: "forever", label: "Vĩnh viễn" },
] as const;

function expiryBadge(expiredAt: string | null): { text: string; cls: string } {
  if (!expiredAt) return { text: "Vĩnh viễn", cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" };
  const diff = new Date(expiredAt).getTime() - Date.now();
  if (diff < 0) return { text: "Đã hết hạn", cls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" };
  const days = Math.ceil(diff / 86_400_000);
  if (days <= 1) return { text: "Hết hạn hôm nay", cls: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" };
  if (days <= 3) return { text: `Còn ${days} ngày`, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
  return { text: `Còn ${days} ngày`, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
}

function UserManagementModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [duration, setDuration] = useState<"1d" | "3d" | "30d" | "forever">("forever");
  const [creating, setCreating] = useState(false);
  const [kicking, setKicking] = useState<string | null>(null);
  const [newCreds, setNewCreds] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
      });
      if (!res.ok) return;
      const { user, credentials } = await res.json();
      setUsers((prev) => [...prev, user as SafeUser]);
      setNewCreds(credentials as { username: string; password: string });
    } finally {
      setCreating(false);
    }
  };

  const handleKick = async (id: string) => {
    setKicking(id);
    try {
      const res = await fetch(`/api/users/${id}/kick`, { method: "POST" });
      if (res.status === 204) {
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isLogin: false, currentIp: null } : u));
      }
    } finally {
      setKicking(null);
    }
  };

  const handleCopy = () => {
    if (!newCreds) return;
    navigator.clipboard.writeText(`Username: ${newCreds.username}\nPassword: ${newCreds.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: "88vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo/win-software-manager.png" alt="" className="h-7 w-auto object-contain rounded-lg bg-white dark:bg-slate-700 p-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quản lý tài khoản</h2>
              <p className="text-xs text-slate-400">{users.length} tài khoản</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition text-lg leading-none">✕</button>
        </div>

        {/* Create toolbar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-800/50">
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Thời hạn:</span>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value as typeof duration)}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-50 transition whitespace-nowrap"
          >
            {creating ? "Đang tạo..." : "+ Tạo tài khoản"}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {/* New credentials card */}
          {newCreds && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20 p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">✓ Tài khoản mới — lưu lại ngay!</span>
                <button onClick={() => setNewCreds(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 leading-none text-sm">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Username</p>
                  <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 select-all">{newCreds.username}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Password</p>
                  <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 select-all">{newCreds.password}</p>
                </div>
              </div>
              <button onClick={handleCopy} className="w-full text-xs py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition font-medium">
                {copied ? "✓ Đã sao chép!" : "📋 Sao chép thông tin đăng nhập"}
              </button>
            </div>
          )}

          {/* User list */}
          {users.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có tài khoản nào.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const expired = u.expiredAt ? new Date(u.expiredAt) < new Date() : false;
                const badge = expiryBadge(u.expiredAt ?? null);
                return (
                <div key={u.id} className={`flex items-center gap-3 rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5 ${expired ? "border-red-200 dark:border-red-900/50" : "border-slate-100 dark:border-slate-800"}`}>
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none ${expired ? "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                    {u.username[0].toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{u.username}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${u.role === "admin" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"}`}>
                        {u.role === "admin" ? "👑 Admin" : "👤 User"}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${u.isLogin ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isLogin ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        {u.isLogin ? "Đang online" : "Offline"}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>
                        ⏱ {badge.text}
                      </span>
                    </div>
                    {u.currentIp && <p className="text-[11px] text-slate-400 font-mono">IP: {u.currentIp}</p>}
                  </div>
                  {/* Kick */}
                  <button
                    onClick={() => handleKick(u.id)}
                    disabled={!u.isLogin || kicking === u.id}
                    title={u.isLogin ? "Kick — buộc đăng xuất" : "Tài khoản đang offline"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-800/60 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >
                    {kicking === u.id ? "..." : "⚡ Kick"}
                  </button>
                </div>
              ); })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SoftwareManager({ software, categories }: { software: Software[]; categories: string[] }) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [installFilter, setInstallFilter] = useState<"all" | "installed" | "not-installed">("all");
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [localDownloadCount, setLocalDownloadCount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setInstalledIds(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  useEffect(() => {
    if (user) setLocalDownloadCount(user.downloadCount);
  }, [user]);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setAnalytics).catch(() => {});
  }, []);

  const trackDownload = useCallback(async (id: string) => {
    setAnalytics((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    fetch(`/api/analytics/${id}`, { method: "POST" }).catch(() => {});
    const sw = software.find((s) => s.id === id);
    if (sw) {
      const res = await fetch("/api/download-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ softwareId: id, softwareName: sw.name }),
      }).catch(() => null);
      if (res?.ok) setLocalDownloadCount((prev) => prev + 1);
    }
  }, [software]);

  const trackBulkDownload = useCallback(async (ids: string[]) => {
    setAnalytics((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = (next[id] ?? 0) + 1; });
      return next;
    });
    let successCount = 0;
    for (const id of ids) {
      fetch(`/api/analytics/${id}`, { method: "POST" }).catch(() => {});
      const sw = software.find((s) => s.id === id);
      if (sw) {
        const res = await fetch("/api/download-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ softwareId: id, softwareName: sw.name }),
        }).catch(() => null);
        if (res?.ok) successCount++;
      }
    }
    if (successCount > 0) setLocalDownloadCount((prev) => prev + successCount);
  }, [software]);

  const markInstalled = useCallback((id: string) => {
    setInstalledIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const unmarkInstalled = useCallback((id: string) => {
    setInstalledIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const markAllInstalled = useCallback((ids: string[]) => {
    setInstalledIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const clearAllInstalled = useCallback(() => {
    setInstalledIds(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return software.filter((s) => {
      if (activeCategory !== "All" && s.category !== activeCategory) return false;
      if (installFilter === "installed" && !installedIds.has(s.id)) return false;
      if (installFilter === "not-installed" && installedIds.has(s.id)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [software, query, activeCategory, installFilter, installedIds]);

  const counts = useMemo(() => {
    const q = query.toLowerCase().trim();
    const searchOnly = q
      ? software.filter((s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q))
        )
      : software;
    const map: Record<string, number> = { All: searchOnly.length };
    for (const cat of categories) map[cat] = searchOnly.filter((s) => s.category === cat).length;
    return map;
  }, [software, categories, query]);

  const selectedItems = useMemo(() => software.filter((s) => selectedIds.has(s.id)), [software, selectedIds]);

  const popular = useMemo(() => {
    return software
      .filter((s) => (analytics[s.id] ?? 0) > 0)
      .sort((a, b) => (analytics[b.id] ?? 0) - (analytics[a.id] ?? 0))
      .slice(0, 5);
  }, [software, analytics]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

  const maxDownloads = user?.role === "admin" ? 0 : (user?.maxDownloads ?? 0);
  const quotaActive = maxDownloads > 0;
  const quotaExceeded = quotaActive && localDownloadCount >= maxDownloads;
  const remaining = quotaActive ? Math.max(0, maxDownloads - localDownloadCount) : -1;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const removeFromSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (selectedIds.size === 1) setShowBulkModal(false);
  };

  const allCategories = ["All", ...categories];
  const hasSelection = selectedIds.size > 0;

  return (
    <>
      {showUserMgmt && <UserManagementModal onClose={() => setShowUserMgmt(false)} />}
      {showBulkModal && hasSelection && (
        <BulkDownloadModal
          items={selectedItems}
          remaining={remaining}
          onRemove={removeFromSelection}
          onClose={() => setShowBulkModal(false)}
          onMarkAllInstalled={markAllInstalled}
          onBulkDownload={trackBulkDownload}
        />
      )}
      {showSuggestForm && <SuggestionModal onClose={() => setShowSuggestForm(false)} />}

      {hasSelection && (
        <SelectionBar
          count={selectedIds.size}
          total={software.length}
          onClear={clearSelection}
          onOpenModal={() => setShowBulkModal(true)}
        />
      )}

      <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 ${hasSelection ? "pb-20" : ""}`}>
        {/* Header */}
        <header className="bg-slate-900 dark:bg-black text-white border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <img src="/logo/win-software-manager.png" alt="Win Software Manager" className="h-10 w-auto object-contain rounded-lg bg-white p-0.5" />
                  <h1 className="text-2xl font-bold tracking-tight">Win Software Manager</h1>
                </div>
                <p className="text-slate-400 text-sm">
                  Bộ sưu tập phần mềm thiết yếu sau khi cài đặt Windows — nhanh chóng, tin cậy.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-800 dark:bg-slate-900 rounded-xl px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-semibold text-lg">{software.length}</span>
                    <span>phần mềm</span>
                  </div>
                  {installedIds.size > 0 && (
                    <>
                      <span className="text-slate-600">·</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-semibold">{installedIds.size}</span>
                        <span className="text-emerald-500">đã cài</span>
                      </div>
                    </>
                  )}
                </div>
                {quotaActive && (
                  <div
                    title={`Đã dùng ${localDownloadCount} / ${maxDownloads} lượt tải`}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl ${
                      quotaExceeded
                        ? "bg-red-900/60 text-red-300"
                        : remaining <= Math.ceil(maxDownloads * 0.2)
                        ? "bg-amber-900/60 text-amber-300"
                        : "bg-slate-800 dark:bg-slate-900 text-slate-300"
                    }`}
                  >
                    <LockIcon />
                    {quotaExceeded ? "Hết lượt" : `${localDownloadCount} / ${maxDownloads} lượt`}
                  </div>
                )}

                {/* Admin button */}
                {user?.role === "admin" && (
                  <button
                    onClick={() => setShowUserMgmt(true)}
                    className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span className="hidden sm:inline">Quản lý tài khoản</span>
                  </button>
                )}

                {/* User info + logout */}
                {user && (
                  <div className="flex items-center gap-1.5 bg-slate-800 dark:bg-slate-900 rounded-xl px-3 py-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white select-none">
                      {user.username[0].toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-300 font-mono hidden sm:inline">{user.username}</span>
                    <button onClick={logout} title="Đăng xuất" className="ml-1 text-slate-500 hover:text-red-400 transition text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    </button>
                  </div>
                )}

                <button
                  onClick={toggle}
                  title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 dark:bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800 transition-all"
                >
                  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mt-6 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm phần mềm, mô tả, tag..."
                className="w-full bg-slate-800 dark:bg-slate-900 text-white placeholder:text-slate-500 rounded-xl pl-11 pr-10 py-3 text-sm border border-slate-700 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white transition">
                  <ClearIcon />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Popular section */}
          {popular.length > 0 && (
            <div className="mb-7">
              <h2 className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                <span>🔥</span> Phần mềm phổ biến
              </h2>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {popular.map((item, rank) => {
                  const count = analytics[item.id] ?? 0;
                  return (
                    <a
                      key={item.id}
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackDownload(item.id)}
                      className="flex-shrink-0 flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition min-w-[155px]"
                    >
                      <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-4 flex-shrink-0 text-center">
                        {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`}
                      </span>
                      <PopularIcon src={item.icon} alt={item.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{item.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{count.toLocaleString("vi-VN")} lượt</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {allCategories.map((cat) => {
              const isActive = activeCategory === cat;
              const count = counts[cat] ?? 0;
              if (cat !== "All" && count === 0 && !isActive) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? getCatButtonColor(cat)
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <span>{getCatIcon(cat)}</span>
                  <span>{cat}</span>
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Install filter bar */}
          {installedIds.size > 0 && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {(["all", "not-installed", "installed"] as const).map((f) => {
                const label = f === "all" ? "Tất cả" : f === "installed" ? "Đã cài" : "Chưa cài";
                const count = f === "all" ? software.length : f === "installed" ? installedIds.size : software.length - installedIds.size;
                const isActive = installFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setInstallFilter(f)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                      isActive
                        ? f === "installed"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : f === "not-installed"
                          ? "bg-slate-700 border-slate-700 text-white"
                          : "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    {f === "installed" && <span>✓</span>}
                    {label}
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={clearAllInstalled}
                className="ml-auto text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 underline underline-offset-2 transition"
              >
                Xóa tất cả đánh dấu
              </button>
            </div>
          )}

          {/* Toolbar row */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-3">
                {(query || activeCategory !== "All") && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tìm thấy <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> phần mềm
                    {query && <> cho <span className="font-semibold text-slate-700 dark:text-slate-300">&ldquo;{query}&rdquo;</span></>}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {(query || activeCategory !== "All") && (
                  <button onClick={() => { setQuery(""); setActiveCategory("All"); }} className="text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline underline-offset-2 transition">
                    Xóa bộ lọc
                  </button>
                )}
                <button
                  onClick={toggleAllFiltered}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all duration-150 ${
                    allFilteredSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${allFilteredSelected ? "bg-white/30 border-transparent" : "border-slate-400 dark:border-slate-500"}`}>
                    {allFilteredSelected && <CheckIcon />}
                  </span>
                  {allFilteredSelected ? `Bỏ chọn tất cả (${filtered.length})` : `Chọn tất cả (${filtered.length})`}
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((s) => (
                <SoftwareCard
                  key={s.id}
                  software={s}
                  selected={selectedIds.has(s.id)}
                  installed={installedIds.has(s.id)}
                  quotaExceeded={quotaExceeded}
                  onToggle={toggleSelect}
                  onMark={markInstalled}
                  onUnmark={unmarkInstalled}
                  onDownload={trackDownload}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-6xl mb-4">{installFilter === "installed" ? "✅" : installFilter === "not-installed" ? "🎉" : "🔍"}</span>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {installFilter === "installed"
                  ? "Chưa đánh dấu phần mềm nào"
                  : installFilter === "not-installed"
                  ? "Tất cả đã được cài đặt!"
                  : "Không tìm thấy phần mềm"}
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                {installFilter === "installed"
                  ? "Bấm nút Tải về trên một phần mềm bất kỳ để đánh dấu là đã cài."
                  : installFilter === "not-installed"
                  ? "Bạn đã đánh dấu tất cả phần mềm trong danh mục này là đã cài đặt."
                  : "Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác."}
              </p>
              <button
                onClick={() => { setQuery(""); setActiveCategory("All"); setInstallFilter("all"); }}
                className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
              >
                Xem tất cả
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between text-sm text-slate-400 dark:text-slate-500">
            <button onClick={() => setShowSuggestForm(true)} className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition">
              <span>💡</span>
              <span>Đề xuất phần mềm</span>
            </button>
            <Link href="/admin" className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition">
              <span>⚙️</span>
              <span>Quản lý</span>
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
