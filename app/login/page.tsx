"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/components/ThemeProvider";
import { useAuth } from "@/app/components/AuthProvider";

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

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
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

export default function LoginPage() {
  const { theme, toggle } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-black flex flex-col items-center justify-center p-4 transition-colors duration-200">
      {/* Dark mode toggle */}
      <div className="fixed top-4 right-4">
        <button
          onClick={toggle}
          title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 dark:bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800 transition-all"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

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
        </form>
      </div>
    </div>
  );
}
