"use client";

import { useMemo } from "react";
import { Activity, Building2, CircleDollarSign, TrendingUp, Users } from "lucide-react";
import { AppShell, AuthGuard } from "@/components/layout/app-shell";
import { readAppState } from "@/lib/app-data";

const statCards = [
  { title: "Total users", value: "3", detail: "Across all roles", icon: Users },
  { title: "Active MCCs", value: "1", detail: "Collection centers", icon: Building2 },
  { title: "Today's collection", value: "1,240L", detail: "Across accepted batches", icon: TrendingUp },
  { title: "Net income", value: "$6,250", detail: "Current month", icon: CircleDollarSign },
];

export default function DashboardPage() {
  const state = useMemo(() => readAppState(), []);

  const stats = useMemo(
    () => [
      { title: "Total users", value: String(state.users.length), detail: "Across all roles", icon: Users },
      { title: "Active MCCs", value: String(state.mccs.length), detail: "Collection centers", icon: Building2 },
      { title: "Audit entries", value: String(state.auditLogs.length), detail: "Latest system events", icon: Activity },
      { title: "Milk price", value: `$${state.settings.milkPrice}/L`, detail: "Configurable price", icon: CircleDollarSign },
    ],
    [state],
  );

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-8">
          <section>
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Overview</p>
                <h1 className="text-3xl font-semibold text-slate-900">Operations dashboard</h1>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                System status: stable
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ title, value, detail, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{title}</p>
                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
                  <p className="mt-2 text-sm text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent system activity</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Live</span>
              </div>

              <div className="space-y-4">
                {state.auditLogs.slice(0, 4).map((audit) => (
                  <div key={audit.auditId} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{audit.action}</p>
                      <p className="mt-1 text-sm text-slate-500">{audit.description}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(audit.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Phase 1 readiness</h2>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Authentication</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> RBAC</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> MCC management</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Audit logging</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Security rules</li>
              </ul>
            </div>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
