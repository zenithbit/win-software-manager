"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { type Software } from "@/app/data/software";
import { useTheme } from "@/app/components/ThemeProvider";
import type { LinkCheckReport, LinkCheckResult } from "@/lib/linkChecker";
import type { Suggestion } from "@/lib/suggestionsDb";
import type { ChangelogEntry } from "@/lib/changelogDb";
import type { SafeUser, UserRole } from "@/lib/usersDb";
import type { DownloadLogEntry } from "@/lib/downloadLogDb";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_BADGE_COLORS: Record<string, string> = {
  System: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Office: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Browsers: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Dev Tools": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Media: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Utilities: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const FALLBACK_BADGE = ["bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300","bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300","bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300","bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300","bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300","bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300"];
function strHash(s: string) { return s.split("").reduce((a, c) => a + c.charCodeAt(0), 0); }
function getCatBadgeColor(cat: string) { return CAT_BADGE_COLORS[cat] ?? FALLBACK_BADGE[strHash(cat) % FALLBACK_BADGE.length]; }

const EMPTY_FORM = {
  name: "",
  category: "",
  icon: "",
  description: "",
  downloadUrl: "",
  tags: "",
  wingetId: "",
};

type FormData = typeof EMPTY_FORM;

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState { msg: string; ok: boolean }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
        toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      <span>{toast.ok ? "✓" : "✕"}</span>
      <span>{toast.msg}</span>
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function SoftwareForm({
  defaultValues,
  onSubmit,
  onCancel,
  saving,
  cats,
}: {
  defaultValues: FormData;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  saving: boolean;
  cats: string[];
}) {
  const [form, setForm] = useState<FormData>(defaultValues);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form); };

  const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide";
  const inputClass = "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>Tên phần mềm *</label>
          <input ref={nameRef} required value={form.name} onChange={set("name")} placeholder="VD: Visual Studio Code" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Danh mục *</label>
          <select required value={form.category} onChange={set("category")} className={inputClass}>
            {!form.category && <option value="" disabled>Chọn danh mục...</option>}
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>URL Icon *</label>
          <input required type="url" value={form.icon} onChange={set("icon")} placeholder="https://example.com/icon.png" className={inputClass} />
          {form.icon && (
            <div className="mt-1.5 flex items-center gap-2">
              <img src={form.icon} alt="" className="w-8 h-8 object-contain rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
              <span className="text-xs text-slate-400">Xem trước</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Mô tả *</label>
        <textarea required value={form.description} onChange={set("description")} placeholder="Mô tả ngắn về phần mềm..." className={`${inputClass} resize-none`} rows={3} />
      </div>

      <div>
        <label className={labelClass}>Link tải về *</label>
        <input required type="url" value={form.downloadUrl} onChange={set("downloadUrl")} placeholder="https://..." className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>
          Tags <span className="text-slate-400 normal-case font-normal">(phân cách bằng dấu phẩy)</span>
        </label>
        <input value={form.tags} onChange={set("tags")} placeholder="VD: editor, ide, code" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>
          Winget ID{" "}
          <span className="text-slate-400 dark:text-slate-500 normal-case font-normal">
            (để trống nếu không có — dùng{" "}
            <code className="bg-slate-100 dark:bg-slate-600 px-1 rounded text-[11px]">winget search &lt;tên&gt;</code>
            {" "}để tìm)
          </span>
        </label>
        <input
          value={form.wingetId}
          onChange={set("wingetId")}
          placeholder="VD: Microsoft.VisualStudioCode"
          className={`${inputClass} font-mono text-xs`}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition text-lg">
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Xóa phần mềm?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Bạn có chắc muốn xóa <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>? Hành động này không thể hoàn tác.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              Hủy
            </button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Changelog Modal ──────────────────────────────────────────────────────────

const ACTION_META: Record<ChangelogEntry["action"], { label: string; dot: string; badge: string }> = {
  add:    { label: "Thêm mới",  dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  edit:   { label: "Cập nhật", dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  delete: { label: "Đã xóa",   dot: "bg-red-500",     badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function ChangelogModal({ entries, onClose }: { entries: ChangelogEntry[]; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const grouped = entries.reduce<Record<string, ChangelogEntry[]>>((acc, entry) => {
    const { date } = formatDateTime(entry.timestamp);
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});
  const dateKeys = Object.keys(grouped);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <HistoryIcon />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nhật ký cập nhật</h2>
              <p className="text-xs text-slate-400">{entries.length} thay đổi được ghi lại</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto px-6 py-4 flex-1">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-sm font-medium">Chưa có thay đổi nào được ghi lại</p>
              <p className="text-xs mt-1">Thêm, sửa hoặc xóa phần mềm để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dateKeys.map((date) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">{date}</span>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                  </div>

                  {/* Entries for this date */}
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800" />

                    <div className="space-y-3">
                      {grouped[date].map((entry) => {
                        const meta = ACTION_META[entry.action];
                        const { time } = formatDateTime(entry.timestamp);
                        return (
                          <div key={entry.id} className="flex items-start gap-4 pl-1">
                            {/* Dot */}
                            <div className={`w-3.5 h-3.5 rounded-full shrink-0 mt-1 ring-2 ring-white dark:ring-slate-900 ${meta.dot}`} />

                            {/* Content */}
                            <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3.5 py-2.5">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.badge}`}>
                                  {meta.label}
                                </span>
                                {entry.category && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getCatBadgeColor(entry.category)}`}>
                                    {entry.category}
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-400 ml-auto shrink-0">{time}</span>
                              </div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                {entry.softwareName}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: "1d",      label: "1 ngày" },
  { value: "3d",      label: "3 ngày" },
  { value: "30d",     label: "30 ngày" },
  { value: "forever", label: "Vĩnh viễn" },
] as const;

type UserDurationLocal = "1d" | "3d" | "30d" | "forever";

function expiryBadge(expiredAt: string | null): { text: string; cls: string } {
  if (!expiredAt) return { text: "Vĩnh viễn", cls: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" };
  const diff = new Date(expiredAt).getTime() - Date.now();
  if (diff < 0) return { text: "Đã hết hạn", cls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" };
  const days = Math.ceil(diff / 86_400_000);
  if (days <= 1) return { text: "Hết hạn hôm nay", cls: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" };
  if (days <= 3) return { text: `Còn ${days} ngày`, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
  return { text: `Còn ${days} ngày`, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
}

function UserManagementPanel({
  users,
  creating,
  onCreateUser,
  onDeleteUser,
  onToggleRole,
  onSetQuota,
  onResetDownloads,
}: {
  users: SafeUser[];
  creating: boolean;
  onCreateUser: (duration: UserDurationLocal) => Promise<{ username: string; password: string } | null>;
  onDeleteUser: (id: string, username: string) => void;
  onToggleRole: (id: string, newRole: UserRole) => void;
  onSetQuota: (id: string, max: number) => void;
  onResetDownloads: (id: string) => void;
}) {
  const [newCreds, setNewCreds] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [duration, setDuration] = useState<UserDurationLocal>("forever");
  const [editingQuotaId, setEditingQuotaId] = useState<string | null>(null);
  const [quotaInput, setQuotaInput] = useState("");

  const handleCopy = () => {
    if (!newCreds) return;
    navigator.clipboard.writeText(`Username: ${newCreds.username}\nPassword: ${newCreds.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    const creds = await onCreateUser(duration);
    if (creds) setNewCreds(creds);
  };

  const openQuotaEdit = (u: SafeUser) => {
    setEditingQuotaId(u.id);
    setQuotaInput(u.maxDownloads > 0 ? String(u.maxDownloads) : "");
  };

  const saveQuota = (id: string) => {
    const val = parseInt(quotaInput, 10);
    onSetQuota(id, isNaN(val) || val < 0 ? 0 : val);
    setEditingQuotaId(null);
  };

  const inputCls = "rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition";

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-auto">
          Tài khoản&nbsp;<span className="text-slate-400 font-normal">({users.length})</span>
        </p>
        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Thời hạn:</span>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as UserDurationLocal)}
          className={inputCls}
        >
          {DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {creating ? "Đang tạo..." : "+ Tạo tài khoản"}
        </button>
      </div>

      {/* One-time credential card */}
      {newCreds && (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              ✓ Tài khoản tạo xong — lưu lại ngay, sẽ không hiển thị lại!
            </span>
            <button onClick={() => setNewCreds(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 leading-none">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Username</p>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 select-all">{newCreds.username}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Password</p>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 select-all">{newCreds.password}</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="w-full text-xs py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition font-medium"
          >
            {copied ? "✓ Đã sao chép!" : "📋 Sao chép thông tin đăng nhập"}
          </button>
        </div>
      )}

      {/* User list */}
      {users.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Chưa có tài khoản nào.</p>
      ) : (
        <div className="space-y-1.5">
          {users.map((u) => {
            const expired = u.expiredAt ? new Date(u.expiredAt) < new Date() : false;
            const badge = expiryBadge(u.expiredAt ?? null);
            const quotaActive = u.role !== "admin" && u.maxDownloads > 0;
            const quotaFull = quotaActive && u.downloadCount >= u.maxDownloads;
            const isEditingQuota = editingQuotaId === u.id;
            return (
            <div key={u.id} className={`rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 ${expired ? "border-red-200 dark:border-red-900/50" : "border-slate-100 dark:border-slate-700"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none ${expired ? "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                  {u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{u.username}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${u.role === "admin" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"}`}>
                      {u.role === "admin" ? "👑 Admin" : "👤 User"}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${u.isLogin ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isLogin ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {u.isLogin ? "Online" : "Offline"}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.cls}`}>
                      ⏱ {badge.text}
                    </span>
                    {/* Quota badge */}
                    {u.role !== "admin" && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        quotaFull
                          ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                          : quotaActive
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      }`}>
                        🔒 {quotaActive ? `${u.downloadCount} / ${u.maxDownloads}` : "∞"}
                      </span>
                    )}
                  </div>
                  {u.currentIp && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">IP: {u.currentIp}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tạo lúc {new Date(u.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {u.role !== "admin" && (
                    <button
                      onClick={() => isEditingQuota ? setEditingQuotaId(null) : openQuotaEdit(u)}
                      title="Cài giới hạn lượt tải"
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition whitespace-nowrap ${isEditingQuota ? "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                    >
                      🔒 Quota
                    </button>
                  )}
                  <button
                    onClick={() => onToggleRole(u.id, u.role === "admin" ? "user" : "admin")}
                    title={`Đổi sang ${u.role === "admin" ? "User" : "Admin"}`}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition whitespace-nowrap"
                  >
                    Đổi role
                  </button>
                  <button
                    onClick={() => onDeleteUser(u.id, u.username)}
                    title="Xóa tài khoản"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Inline quota editor */}
              {isEditingQuota && (
                <div className="mt-2.5 ml-11 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Giới hạn tải:</span>
                  <input
                    type="number"
                    min="0"
                    value={quotaInput}
                    onChange={(e) => setQuotaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveQuota(u.id); if (e.key === "Escape") setEditingQuotaId(null); }}
                    placeholder="0 = không giới hạn"
                    className="w-36 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition"
                    autoFocus
                  />
                  <button
                    onClick={() => saveQuota(u.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition"
                  >
                    Lưu
                  </button>
                  {u.downloadCount > 0 && (
                    <button
                      onClick={() => { onResetDownloads(u.id); setEditingQuotaId(null); }}
                      title="Đặt lại số lượt đã tải về 0"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition whitespace-nowrap"
                    >
                      ↺ Reset ({u.downloadCount})
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400">Hiện tại: {u.downloadCount} lượt</span>
                </div>
              )}
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
          {[40, 180, 100, 200, 160, 90].map((w, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" style={{ width: w }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Link Checker ─────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function LinkCheckerPanel({
  report,
  checking,
  onCheck,
}: {
  report: LinkCheckReport | null;
  checking: boolean;
  onCheck: () => void;
}) {
  const broken = report?.results.filter((r: LinkCheckResult) => r.status === "broken") ?? [];
  const errored = report?.results.filter((r: LinkCheckResult) => r.status === "error") ?? [];
  const issues = [...broken, ...errored];
  const allOk = report && issues.length === 0;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 transition-colors ${
        issues.length > 0
          ? "border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">🔗</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kiểm tra Link Tải</span>
          {report?.lastChecked && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              · Lần cuối: {relativeTime(report.lastChecked)}
            </span>
          )}
          {allOk && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              · ✓ Tất cả {report.results.length} link OK
            </span>
          )}
          {issues.length > 0 && (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              · ⚠ {issues.length} link có vấn đề
            </span>
          )}
        </div>
        <button
          onClick={onCheck}
          disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {checking ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Đang kiểm tra...
            </>
          ) : (
            <>{report ? "Kiểm tra lại" : "Kiểm tra ngay"}</>
          )}
        </button>
      </div>

      {issues.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {issues.map((r: LinkCheckResult) => (
            <li key={r.id} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${r.status === "broken" ? "bg-red-500" : "bg-amber-400"}`} />
              <span className="font-medium text-slate-800 dark:text-slate-200 min-w-[120px]">{r.name}</span>
              <a
                href={r.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-xs"
              >
                {r.downloadUrl}
              </a>
              <span className={`flex-shrink-0 font-mono px-1.5 py-0.5 rounded ${r.status === "broken" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"}`}>
                {r.status === "broken" ? (r.statusCode ?? "lỗi") : "timeout"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function softwareToForm(s: Software): FormData {
  return {
    name: s.name,
    category: s.category,
    icon: s.icon,
    description: s.description,
    downloadUrl: s.downloadUrl,
    tags: s.tags?.join(", ") ?? "",
    wingetId: s.wingetId ?? "",
  };
}

function formToPayload(f: FormData): Omit<Software, "id"> {
  return {
    name: f.name.trim(),
    category: f.category.trim(),
    icon: f.icon.trim(),
    description: f.description.trim(),
    downloadUrl: f.downloadUrl.trim(),
    tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    wingetId: f.wingetId.trim() || undefined,
  };
}

export default function AdminDashboard() {
  const { theme, toggle } = useTheme();
  const [items, setItems] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("All");
  const [modal, setModal] = useState<"new" | Software | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Software | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [linkReport, setLinkReport] = useState<LinkCheckReport | null>(null);
  const [linkChecking, setLinkChecking] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newFormPreset, setNewFormPreset] = useState<Partial<typeof EMPTY_FORM>>({});
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [userCreating, setUserCreating] = useState(false);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/software");
      setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    fetch("/api/link-checker")
      .then((r) => r.json())
      .then((data) => { if (data.results) setLinkReport(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/suggestions")
      .then((r) => r.json())
      .then(setSuggestions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setAnalytics).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/changelog").then((r) => r.json()).then(setChangelog).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    setLogsLoading(true);
    fetch("/api/download-log")
      .then((r) => r.json())
      .then(setDownloadLogs)
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []);

  const handleCreateUser = useCallback(async (duration: UserDurationLocal): Promise<{ username: string; password: string } | null> => {
    setUserCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(error); }
      const { user, credentials } = await res.json();
      setUsers((prev) => [...prev, user]);
      setToast({ msg: `Đã tạo tài khoản "${user.username}"!`, ok: true });
      return credentials as { username: string; password: string };
    } catch (err) {
      setToast({ msg: (err as Error).message || "Không thể tạo tài khoản.", ok: false });
      return null;
    } finally {
      setUserCreating(false);
    }
  }, []);

  const handleDeleteUser = useCallback(async (id: string, username: string) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.status === 204) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setToast({ msg: `Đã xóa tài khoản "${username}"!`, ok: true });
    } else {
      setToast({ msg: "Không thể xóa tài khoản.", ok: false });
    }
  }, []);

  const handleToggleRole = useCallback(async (id: string, newRole: "admin" | "user") => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setToast({ msg: `Đã đổi role thành ${newRole === "admin" ? "Admin" : "User"}.`, ok: true });
    } else {
      setToast({ msg: "Không thể đổi role.", ok: false });
    }
  }, []);

  const handleSetQuota = useCallback(async (id: string, max: number) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxDownloads: max }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setToast({ msg: max === 0 ? "Đã bỏ giới hạn lượt tải." : `Đã đặt giới hạn ${max} lượt tải.`, ok: true });
    } else {
      setToast({ msg: "Không thể cập nhật giới hạn.", ok: false });
    }
  }, []);

  const handleResetDownloads = useCallback(async (id: string) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadCount: 0 }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setToast({ msg: "Đã reset lượt tải về 0.", ok: true });
    } else {
      setToast({ msg: "Không thể reset lượt tải.", ok: false });
    }
  }, []);

  const logChange = useCallback(async (action: ChangelogEntry["action"], sw: Software) => {
    try {
      const res = await fetch("/api/changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, softwareName: sw.name, softwareId: sw.id, category: sw.category }),
      });
      const entry: ChangelogEntry = await res.json();
      setChangelog((prev) => [entry, ...prev]);
    } catch {}
  }, []);

  const handleAddCategory = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setCatSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(error); }
      const cats: string[] = await res.json();
      setCategories(cats);
      setNewCatName("");
      setToast({ msg: `Đã thêm danh mục "${name}"!`, ok: true });
    } catch (err) {
      setToast({ msg: (err as Error).message || "Không thể thêm danh mục.", ok: false });
    } finally {
      setCatSaving(false);
    }
  }, [newCatName]);

  const handleDeleteCategory = useCallback(async (name: string) => {
    const res = await fetch(`/api/categories/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (res.status === 204) {
      setCategories((prev) => prev.filter((c) => c !== name));
      setToast({ msg: `Đã xóa danh mục "${name}"!`, ok: true });
    } else {
      const { error } = await res.json();
      setToast({ msg: error || "Không thể xóa danh mục.", ok: false });
    }
  }, []);

  const handleRejectSuggestion = useCallback(async (id: string) => {
    const res = await fetch(`/api/suggestions/${id}`, { method: "DELETE" });
    if (res.status === 204) setSuggestions((prev) => prev.filter((s) => s.id !== id));
    else setToast({ msg: "Không thể xóa đề xuất.", ok: false });
  }, []);

  const handleApproveSuggestion = useCallback((s: Suggestion) => {
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    fetch(`/api/suggestions/${s.id}`, { method: "DELETE" });
    setNewFormPreset({
      name: s.name,
      downloadUrl: s.downloadUrl,
      description: s.note ?? "",
    });
    setModal("new");
  }, []);

  const handleLinkCheck = useCallback(async () => {
    setLinkChecking(true);
    try {
      const res = await fetch("/api/link-checker", { method: "POST" });
      const report: LinkCheckReport = await res.json();
      setLinkReport(report);
      const issues = report.results.filter((r) => r.status !== "ok");
      setToast({
        msg: issues.length > 0
          ? `Phát hiện ${issues.length} link có vấn đề!`
          : `Tất cả ${report.results.length} link đang hoạt động tốt.`,
        ok: issues.length === 0,
      });
    } catch {
      setToast({ msg: "Không thể kiểm tra link.", ok: false });
    } finally {
      setLinkChecking(false);
    }
  }, []);

  const filtered = items.filter((s) => {
    if (catFilter !== "All" && s.category !== catFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const searchFiltered = items.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const stats: Record<string, number> = {};
  for (const c of categories) stats[c] = searchFiltered.filter((s) => s.category === c).length;

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    try {
      if (modal === "new") {
        const res = await fetch("/api/software", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formToPayload(formData)),
        });
        if (!res.ok) throw new Error();
        const created: Software = await res.json();
        setItems((prev) => [...prev, created]);
        setToast({ msg: `Đã thêm "${created.name}"!`, ok: true });
        logChange("add", created);
      } else if (modal && typeof modal === "object") {
        const res = await fetch(`/api/software/${modal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formToPayload(formData)),
        });
        if (!res.ok) throw new Error();
        const updated: Software = await res.json();
        setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setToast({ msg: `Đã cập nhật "${updated.name}"!`, ok: true });
        logChange("edit", updated);
      }
      setModal(null);
    } catch {
      setToast({ msg: "Có lỗi xảy ra, vui lòng thử lại.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);
    const target = items.find((s) => s.id === id);
    const res = await fetch(`/api/software/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((s) => s.id !== id));
      setToast({ msg: `Đã xóa "${name}"!`, ok: true });
      if (target) logChange("delete", target);
    } else {
      setToast({ msg: "Không thể xóa, vui lòng thử lại.", ok: false });
    }
  };

  const modalDefaultValues = modal === "new"
    ? { ...EMPTY_FORM, category: categories[0] ?? "", ...newFormPreset }
    : modal ? softwareToForm(modal) : EMPTY_FORM;
  const modalTitle = modal === "new" ? "Thêm phần mềm mới" : `Chỉnh sửa: ${(modal as Software)?.name}`;

  return (
    <>
      {modal && (
        <Modal title={modalTitle} onClose={() => { setModal(null); setNewFormPreset({}); }}>
          <SoftwareForm defaultValues={modalDefaultValues} onSubmit={handleSave} onCancel={() => { setModal(null); setNewFormPreset({}); }} saving={saving} cats={categories} />
        </Modal>
      )}
      {confirmDelete && (
        <DeleteConfirm name={confirmDelete.name} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      {showChangelog && <ChangelogModal entries={changelog} onClose={() => setShowChangelog(false)} />}

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        {/* Header */}
        <header className="bg-slate-900 dark:bg-black text-white border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo/win-software-manager.png" alt="Win Software Manager" className="h-9 w-auto object-contain rounded-lg bg-white p-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">Win Software Manager</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900">ADMIN</span>
                </div>
                <p className="text-slate-400 text-xs">
                  Quản lý danh sách phần mềm
                  {suggestions.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">{suggestions.length}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-900"
              >
                <span>←</span>
                <span>Xem trang chính</span>
              </Link>
              <button
                onClick={() => setShowChangelog(true)}
                title="Nhật ký cập nhật"
                className="relative flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-900"
              >
                <HistoryIcon />
                <span className="hidden sm:inline">Nhật ký</span>
                {changelog.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">
                    {changelog.length > 99 ? "99+" : changelog.length}
                  </span>
                )}
              </button>
              <button
                onClick={toggle}
                title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 dark:bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800 transition-all"
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          {/* Stats bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium mr-1">
              Tổng: <span className="text-slate-900 dark:text-slate-100 font-bold">{items.length}</span> phần mềm
            </span>
            {categories.map((c) => {
              const count = stats[c] ?? 0;
              if (count === 0 && catFilter !== c) return null;
              return (
                <button
                  key={c}
                  onClick={() => setCatFilter(catFilter === c ? "All" : c)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                    catFilter === c
                      ? getCatBadgeColor(c) + " border-transparent ring-2 ring-offset-1 ring-current"
                      : getCatBadgeColor(c) + " border-transparent hover:ring-1 hover:ring-current"
                  }`}
                >
                  {c}
                  <span className="font-bold">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Link Checker */}
          <LinkCheckerPanel report={linkReport} checking={linkChecking} onCheck={handleLinkCheck} />

          {/* Category Manager */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2.5">
              Danh mục <span className="text-slate-400 font-normal">({categories.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {categories.map((cat) => {
                const inUse = items.some((s) => s.category === cat);
                return (
                  <span key={cat} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium ${getCatBadgeColor(cat)}`}>
                    {cat}
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      disabled={inUse}
                      title={inUse ? "Đang được sử dụng, không thể xóa" : `Xóa "${cat}"`}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Tên danh mục mới..."
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition"
              />
              <button
                type="submit"
                disabled={catSaving || !newCatName.trim()}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-600 text-white text-sm font-semibold hover:bg-slate-700 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
              >
                {catSaving ? "..." : "+ Thêm"}
              </button>
            </form>
          </div>

          {/* Suggestions Panel */}
          {suggestions.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2.5 flex items-center gap-2">
                <span>💡</span>
                Đề xuất từ cộng đồng
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400 text-slate-900 text-[11px] font-bold">{suggestions.length}</span>
              </p>
              <ul className="space-y-2">
                {suggestions.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-100 dark:border-slate-700 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(s.submittedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {s.downloadUrl && (
                        <a href={s.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition truncate block max-w-sm mt-0.5">
                          {s.downloadUrl}
                        </a>
                      )}
                      {s.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">&ldquo;{s.note}&rdquo;</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleApproveSuggestion(s)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700 dark:hover:bg-slate-500 transition whitespace-nowrap"
                      >
                        + Tạo phần mềm
                      </button>
                      <button
                        onClick={() => handleRejectSuggestion(s.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* User Management */}
          <UserManagementPanel
            users={users}
            creating={userCreating}
            onCreateUser={handleCreateUser}
            onDeleteUser={handleDeleteUser}
            onToggleRole={handleToggleRole}
            onSetQuota={handleSetQuota}
            onResetDownloads={handleResetDownloads}
          />

          {/* Download Log */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span>📥</span>
                Nhật ký tải về
                {downloadLogs.length > 0 && (
                  <span className="text-slate-400 font-normal">({downloadLogs.length})</span>
                )}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left">
                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-10">#</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Người dùng</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Phần mềm</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Thời gian</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                        {[60, 120, 160, 140, 100].map((w, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3.5 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" style={{ width: w }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : downloadLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                        <div className="text-3xl mb-2">📭</div>
                        Chưa có lượt tải nào được ghi lại
                      </td>
                    </tr>
                  ) : (
                    downloadLogs.map((log, i) => {
                      const dt = new Date(log.downloadedAt);
                      const date = dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
                      const time = dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                      return (
                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-slate-400 dark:text-slate-500">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                              <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-500 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-200 flex-shrink-0">
                                {log.username[0].toUpperCase()}
                              </span>
                              {log.username}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{log.softwareName}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {date} <span className="text-slate-400 dark:text-slate-500">{time}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            {log.ipAddress ? (
                              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{log.ipAddress}</span>
                            ) : (
                              <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm phần mềm..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600 transition"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => setModal("new")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-sm font-semibold hover:bg-slate-700 dark:hover:bg-slate-600 transition whitespace-nowrap"
            >
              <span className="text-base leading-none">＋</span>
              Thêm phần mềm
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {filtered.length > 0 && !loading && (
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                Hiển thị <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> / {items.length} phần mềm
                {catFilter !== "All" && (
                  <button onClick={() => setCatFilter("All")} className="ml-2 underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-100">
                    Bỏ lọc danh mục
                  </button>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-10">#</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-12">Icon</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tên phần mềm</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Danh mục</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mô tả</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Link tải</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Lượt tải</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Thao tác</th>
                  </tr>
                </thead>
                {loading ? (
                  <TableSkeleton />
                ) : filtered.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                        <div className="text-4xl mb-2">🔍</div>
                        {search ? `Không tìm thấy "${search}"` : "Chưa có phần mềm nào"}
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <img src={s.icon} alt="" className="w-8 h-8 object-contain rounded" onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{s.name}</span>
                            {s.wingetId ? (
                              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded hidden xl:inline dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700" title={`winget install --id ${s.wingetId}`}>
                                {s.wingetId}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded hidden xl:inline dark:bg-slate-700 dark:text-slate-500">no winget</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getCatBadgeColor(s.category)}`}>
                            {s.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs">
                          <span title={s.description} className="line-clamp-1">{s.description}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {linkReport && (() => {
                              const r = linkReport.results.find((lr) => lr.id === s.id);
                              if (!r) return null;
                              const color =
                                r.status === "ok" ? "bg-emerald-400" :
                                r.status === "broken" ? "bg-red-500" : "bg-amber-400";
                              const label =
                                r.status === "ok" ? "Link hoạt động" :
                                r.status === "broken" ? `Lỗi ${r.statusCode ?? ""}` : "Không thể kết nối";
                              return <span title={label} className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
                            })()}
                            <a
                              href={s.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={s.downloadUrl}
                              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1 text-xs max-w-[180px]"
                            >
                              <span className="truncate">{s.downloadUrl.replace(/^https?:\/\//, "")}</span>
                              <span className="flex-shrink-0">↗</span>
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const c = analytics[s.id] ?? 0;
                            return c > 0
                              ? <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.toLocaleString("vi-VN")}</span>
                              : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setModal(s)}
                              title="Chỉnh sửa"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-600 transition"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(s)}
                              title="Xóa"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 text-center pb-4">
            Dữ liệu được lưu trong <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">data/software-db.json</code>
          </p>
        </div>
      </div>
    </>
  );
}
