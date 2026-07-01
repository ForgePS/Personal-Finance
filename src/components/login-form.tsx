"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  establishServerSession,
  isFirebaseAuthConfigured,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/auth-client";
import { Command } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const firebaseConfigured = isFirebaseAuthConfigured();
  const devBypass = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

  const handleDevSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/auth/session", { method: "POST" });
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const credential =
        mode === "signin"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password);
      await establishServerSession(credential.user);
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Command className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Money Command</h1>
            <p className="text-sm text-slate-400">Sign in to your workspace</p>
          </div>
        </div>

        {devBypass && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="mb-3 text-sm text-amber-100">
              Development mode — auth bypass is enabled.
            </p>
            <button
              type="button"
              onClick={handleDevSignIn}
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              Continue as Dev User
            </button>
          </div>
        )}

        {firebaseConfigured ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-white outline-none ring-indigo-500 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-white outline-none ring-indigo-500 focus:ring-2"
              />
            </div>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-sm text-slate-400 hover:text-white"
            >
              {mode === "signin"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </form>
        ) : (
          !devBypass && (
            <p className="text-sm text-slate-400">
              Configure Firebase Auth environment variables or enable{" "}
              <code className="text-indigo-300">AUTH_BYPASS=true</code> for local development.
            </p>
          )
        )}
      </div>
    </div>
  );
}
