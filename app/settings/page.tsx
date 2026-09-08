"use client";

import { useEffect, useState } from "react";
import { AppShell, AccessDenied, AuthGuard } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { hasPermission } from "@/lib/auth/roles";
import { readAppState, writeAppState, type AppState } from "@/lib/app-data";

export default function SettingsPage() {
  const { user } = useAuth();
  const [state, setState] = useState<AppState | null>(null);
  const [projectName, setProjectName] = useState("");
  const [milkPrice, setMilkPrice] = useState("");
  const [mccSharePercent, setMccSharePercent] = useState("");
  const [collectorSharePercent, setCollectorSharePercent] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const nextState = await readAppState();
      if (isMounted) {
        setState(nextState);
        setProjectName(nextState.settings.projectName);
        setMilkPrice(String(nextState.settings.milkPrice));
        setMccSharePercent(String(nextState.settings.mccSharePercent));
        setCollectorSharePercent(String(nextState.settings.collectorSharePercent));
      }
    }

    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!user || !hasPermission(user.role, "settings.view")) {
    return (
      <AuthGuard>
        <AppShell>
          <AccessDenied />
        </AppShell>
      </AuthGuard>
    );
  }

  if (!state) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Loading settings…</div>
        </AppShell>
      </AuthGuard>
    );
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (user?.role !== "MCC_MANAGER") return;
    const mccShare = Number(mccSharePercent);
    const collectorShare = Number(collectorSharePercent);
    if (mccShare < 0 || collectorShare < 0 || mccShare + collectorShare > 100) return;
    if (!window.confirm("Are you sure you want to save these settings?")) return;
    const nextState = await readAppState();
    await writeAppState({
      ...nextState,
      settings: {
        ...nextState.settings,
        projectName,
        milkPrice: Number(milkPrice) || nextState.settings.milkPrice,
        mccSharePercent: mccShare,
        collectorSharePercent: collectorShare,
      },
    });
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">System</p>
            <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
          </div>

          <form onSubmit={saveSettings} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Project name</span>
                <input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">MCC share (%)</span>
                <input type="number" min="0" max="100" step="0.01" value={mccSharePercent} onChange={(event) => setMccSharePercent(event.target.value)} disabled={user.role !== "MCC_MANAGER"} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Milk collector share (%)</span>
                <input type="number" min="0" max="100" step="0.01" value={collectorSharePercent} onChange={(event) => setCollectorSharePercent(event.target.value)} disabled={user.role !== "MCC_MANAGER"} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
              </label>

              <label className="block text-sm text-slate-700">
                <span className="mb-2 block font-medium">Milk price per litre</span>
                <input
                  type="number"
                  value={milkPrice}
                  onChange={(event) => setMilkPrice(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <button type="submit" disabled={user.role !== "MCC_MANAGER"} className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50">
              Save settings
            </button>
          </form>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
