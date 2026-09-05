"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Briefcase,
  Building2,
  Gauge,
  Lock,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { hasPermission } from "@/lib/auth/roles";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, permission: "dashboard.view" },
  { href: "/mcc", label: "MCC Management", icon: Building2, permission: "mcc.view" },
  { href: "/users", label: "Users", icon: Users, permission: "users.view" },
  { href: "/audit", label: "Audit Logs", icon: Activity, permission: "audit.view" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.view" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  const filteredItems = navItems.filter((item) => hasPermission(user.role, item.permission));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full bg-slate-900 px-4 py-6 text-slate-100 lg:w-72 lg:min-h-screen">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Milk</p>
              <h1 className="text-lg font-semibold">Digital Supply Chain</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {filteredItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              Access
            </div>
            <p className="text-sm font-medium text-white">{user.role}</p>
            <p className="mt-1 text-xs text-slate-400">{user.email}</p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operations overview</p>
                <h2 className="text-xl font-semibold text-slate-900">Milk Collection Management</h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  <Bell className="h-4 w-4" />
                  3 alerts
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <ArrowUpRight className="h-4 w-4" />
                  {user.fullName}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="p-5 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    router.replace("/login");
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading session...</div>;
  }

  return <>{children}</>;
}

export function AccessDenied() {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
      <div className="flex items-center gap-3">
        <Lock className="h-5 w-5" />
        <div>
          <h3 className="text-lg font-semibold">Access denied</h3>
          <p className="text-sm text-red-700">Your role does not have permission to view this page.</p>
        </div>
      </div>
    </div>
  );
}
