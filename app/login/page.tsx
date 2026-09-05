"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@milk.local");
  const [password, setPassword] = useState("admin123");
  const [message, setMessage] = useState("");

  if (user) {
    router.replace("/dashboard");
    return null;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = login(email, password);
    setMessage(result.message);

    if (result.ok) {
      router.push("/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/40 lg:grid-cols-2">
        <div className="flex flex-col justify-between bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 p-8 text-white md:p-10">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em]">
              <ShieldCheck className="h-4 w-4" />
              Phase 1 foundation
            </div>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">Digital Milk Collection System</h1>
            <p className="mt-4 max-w-md text-sm text-emerald-50/90">
              Secure milk traceability, MCC operations, role-based access, and audit visibility for the entire collection chain.
            </p>
          </div>

          <div className="mt-10 space-y-3 text-sm text-emerald-50/90">
            <p>Demo accounts:</p>
            <ul className="space-y-2">
              <li>• admin@milk.local / admin123</li>
              <li>• manager@milk.local / manager123</li>
              <li>• officer@milk.local / officer123</li>
            </ul>
          </div>
        </div>

        <div className="bg-white p-8 md:p-10">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Authentication</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Welcome back</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:bg-white"
                placeholder="admin@milk.local"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:bg-white"
                placeholder="••••••••"
                required
              />
            </div>

            {message ? (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  message.includes("successful") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Login
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Need access? <Link href="/login" className="font-medium text-emerald-700">Request credentials</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
