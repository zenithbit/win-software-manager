"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "user";
  maxDownloads: number;
  downloadCount: number;
  isLogin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Kicked Modal ─────────────────────────────────────────────────────────────

function KickedModal({ onDone }: { onDone: () => void }) {
  const [countdown, setCountdown] = useState(3);
  // Use a ref so the effect only mounts once — avoids re-triggering if onDone changes reference
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(tick);
          onDoneRef.current();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []); // intentionally empty — runs once on mount

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-slate-900 border border-red-700/60 rounded-2xl shadow-2xl overflow-hidden">
        <div
          className="h-1 bg-red-600 transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / 3) * 100}%` }}
        />
        <div className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-3xl">
            ⛔
          </div>
          <div>
            <h2 className="text-base font-bold text-red-400 mb-1">Quyền truy cập bị thu hồi</h2>
            <p className="text-sm text-slate-300">
              Quản trị viên đã xóa phiên đăng nhập của bạn.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Đăng xuất sau{" "}
            <span className="text-white font-bold text-sm">{countdown}</span>{" "}
            giây...
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [kicked, setKicked] = useState(false);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kickedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const doLogout = useCallback(async () => {
    stopPolling();
    await fetch("/api/logout", { method: "POST" });
    // Hard redirect — ensures middleware re-runs with cleared cookie
    window.location.replace("/login");
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      if (kickedRef.current) return;
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          if (res.status === 401) {
            kickedRef.current = true;
            setKicked(true);
            stopPolling();
          }
          return;
        }
        const data = await res.json();
        const fetched = data?.user as (AuthUser & { isLogin?: boolean }) | null;
        if (fetched && fetched.isLogin === false) {
          kickedRef.current = true;
          setKicked(true);
          stopPolling();
        } else if (fetched) {
          setUser(fetched);
        }
      } catch {
        // Ignore network errors — keep polling
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  // Initial session restore
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const fetched = data?.user as AuthUser | null;
        if (fetched?.isLogin === false) {
          setUser(null);
        } else {
          setUser(fetched ?? null);
          if (fetched) startPolling();
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    return stopPolling;
  }, [startPolling, stopPolling]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error as string };
    setUser(data.user as AuthUser);
    kickedRef.current = false;
    startPolling();
    return { ok: true };
  }, [startPolling]);

  const logout = useCallback(async () => {
    stopPolling();
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router, stopPolling]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
      {kicked && <KickedModal onDone={doLogout} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
