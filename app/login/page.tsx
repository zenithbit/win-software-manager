"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalState =
  | { phase: "form" }
  | { phase: "waiting" }
  | { phase: "approved"; username: string; password: string }
  | { phase: "declined"; reason: string };

const DURATION_LABELS: Record<string, string> = {
  "1d": "1 ngày",
  "3d": "3 ngày",
  "30d": "30 ngày",
  "forever": "Không giới hạn",
};

// ─── Account Request Modal ────────────────────────────────────────────────────

function AccountRequestModal({
  onClose,
  onAutoFill,
}: {
  onClose: () => void;
  onAutoFill: (username: string, password: string) => void;
}) {
  const [state, setState] = useState<ModalState>({ phase: "form" });
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30d");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    const poll = async () => {
      try {
        const res = await fetch("/api/account-requests/status");
        const data = (await res.json()) as {
          status: string;
          declineReason?: string;
          genUsername?: string;
          genPassword?: string;
        };
        if (data.status === "approved" && data.genUsername && data.genPassword) {
          stopPolling();
          setState({ phase: "approved", username: data.genUsername, password: data.genPassword });
        } else if (data.status === "declined") {
          stopPolling();
          setState({ phase: "declined", reason: data.declineReason ?? "Không có lý do cụ thể." });
        }
      } catch {
        // silently continue polling
      }
    };
    pollRef.current = setInterval(poll, 3000);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/account-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), duration }),
      });
      const data = await res.json();
      if (res.status === 409) {
        // Already has a request — check current status
        const statusRes = await fetch("/api/account-requests/status");
        const statusData = (await statusRes.json()) as {
          status: string;
          declineReason?: string;
          genUsername?: string;
          genPassword?: string;
        };
        if (statusData.status === "approved" && statusData.genUsername && statusData.genPassword) {
          setState({ phase: "approved", username: statusData.genUsername, password: statusData.genPassword });
        } else if (statusData.status === "declined") {
          setState({ phase: "declined", reason: statusData.declineReason ?? "Không có lý do cụ thể." });
        } else {
          setState({ phase: "waiting" });
          startPolling();
        }
        return;
      }
      if (!res.ok) {
        setFormError(data.error ?? "Gửi yêu cầu thất bại.");
        return;
      }
      setState({ phase: "waiting" });
      startPolling();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccessGranted = () => {
    if (state.phase === "approved") {
      onAutoFill(state.username, state.password);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Phase: form */}
        {state.phase === "form" && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-white">Yêu cầu cấp tài khoản</h2>
              <button type="button" onClick={onClose} className="text-slate-500 hover:text-white transition text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-slate-400">
              Điền thông tin bên dưới. Admin sẽ xem xét và phê duyệt yêu cầu của bạn.
            </p>

            {formError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-950/60 border border-red-800/60 px-3 py-2.5 text-xs text-red-300">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Họ tên / Tên tổ chức
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Thời hạn sử dụng
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(DURATION_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDuration(val)}
                    className={`py-2 rounded-xl border text-sm font-medium transition ${
                      duration === val
                        ? "border-white bg-white text-slate-900"
                        : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang gửi...
                </span>
              ) : "Gửi yêu cầu"}
            </button>
          </form>
        )}

        {/* Phase: waiting */}
        {state.phase === "waiting" && (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-white animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🕐</span>
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white mb-1">Đang chờ phê duyệt</h2>
              <p className="text-xs text-slate-400">
                Yêu cầu của bạn đã được ghi nhận. Admin sẽ xem xét trong thời gian sớm nhất.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang kiểm tra trạng thái...
            </div>
            <button
              type="button"
              onClick={() => { stopPolling(); onClose(); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition mt-2 underline underline-offset-2"
            >
              Đóng (yêu cầu vẫn đang chờ)
            </button>
          </div>
        )}

        {/* Phase: approved */}
        {state.phase === "approved" && (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-3xl">
              ✓
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-400 mb-1">Truy cập được cấp!</h2>
              <p className="text-xs text-slate-400">Tài khoản của bạn đã được tạo thành công.</p>
            </div>
            <div className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-left space-y-2">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Tên đăng nhập</p>
                <p className="text-sm font-mono text-white">{state.username}</p>
              </div>
              <div className="border-t border-slate-700" />
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Mật khẩu</p>
                <p className="text-sm font-mono text-white">{state.password}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Hãy lưu lại thông tin này trước khi đóng.</p>
            <button
              type="button"
              onClick={handleAccessGranted}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Phase: declined */}
        {state.phase === "declined" && (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-3xl">
              ✕
            </div>
            <div>
              <h2 className="text-base font-bold text-red-400 mb-1">Yêu cầu bị từ chối</h2>
              <p className="text-xs text-slate-400">Admin đã từ chối yêu cầu tài khoản của bạn.</p>
            </div>
            <div className="w-full rounded-xl bg-red-950/40 border border-red-800/50 px-4 py-3 text-left">
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1">Lý do</p>
              <p className="text-sm text-red-200">{state.reason}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 transition"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Check if there's already a pending/resolved request for this IP on mount
  useEffect(() => {
    fetch("/api/account-requests/status").catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError("");
    setLoading(true);
    const result = await login(username.trim(), password.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Đăng nhập thất bại.");
    } else {
      router.push("/");
    }
  };

  const handleAutoFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo/win-software-manager.png"
            alt="Win Software Manager"
            className="h-16 w-auto object-contain rounded-2xl bg-white p-1 mb-4 shadow-lg"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">Win Software Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Đăng nhập để tiếp tục</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
        >
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-950/60 border border-red-800/60 px-3.5 py-3 text-sm text-red-300">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              autoComplete="username"
              autoFocus
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-600 transition font-mono"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-600 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-500 hover:text-slate-300 transition"
                tabIndex={-1}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Đang đăng nhập...
              </span>
            ) : "Đăng nhập"}
          </button>

          {/* Request account */}
          <div className="border-t border-slate-800 pt-3 text-center">
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Chưa có tài khoản?{" "}
              <span className="underline underline-offset-2 text-slate-400 hover:text-white">
                Yêu cầu cấp quyền truy cập
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Account Request Modal */}
      {showRequestModal && (
        <AccountRequestModal
          onClose={() => setShowRequestModal(false)}
          onAutoFill={handleAutoFill}
        />
      )}
    </div>
  );
}
