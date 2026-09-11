"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ArrowRight, ShieldCheck } from "lucide-react";

function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@milk.local");
  const [password, setPassword] = useState("admin123");
  const [message, setMessage] = useState("");

  if (user) {
    return <RedirectToDashboard />;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await login(email, password);
    setMessage(result.message);

    if (result.ok) {
      router.push("/dashboard");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f1f7f3] px-4 py-8">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-amber-100/80 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between bg-gradient-to-br from-[#12382d] via-[#167245] to-[#25a866] p-8 text-white md:p-10">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em]">
              <ShieldCheck className="h-4 w-4" />
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(167,243,208,0.15)]" />
              Cooperative operations
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">Every litre.<br />Accounted for.</h1>
            <p className="mt-4 max-w-md text-sm text-emerald-50/90">
              Digital milk traceability, MCC coordination, role-based access, and clear visibility across your collection chain.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-emerald-50/90 backdrop-blur-sm">
            <p className="font-semibold text-white">Demo access</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              <li>• admin@milk.local / admin123</li>
              <li>• manager@milk.local / manager123</li>
              <li>• officer@milk.local / officer123</li>
              <li>• farmer@milk.local / farmer123</li>
              <li>• collector@milk.local / collector123</li>
              <li>• vet@milk.local / vet123</li>
            </ul>
          </div>
        </div>

        <div className="bg-white p-8 md:p-12">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Secure sign in</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#12382d]">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">Continue managing your milk supply chain.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email or username</label>
              <input
              type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:bg-white focus:shadow-lg focus:shadow-emerald-100"
                placeholder="admin@milk.local or admin"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:bg-white focus:shadow-lg focus:shadow-emerald-100"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#12382d] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-[#1a523e]"
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
