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
  ClipboardList,
  Droplets,
  FileText,
  Calculator,
  Wrench,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { hasPermission } from "@/lib/auth/roles";
import { useEffect, useState, type ReactNode } from "react";
import type { Animal, Farmer, VeterinaryRecord } from "@/lib/phase2-data";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, permission: "dashboard.view" },
  { href: "/mcc", label: "MCC Management", icon: Building2, permission: "mcc.view" },
  { href: "/users", label: "Users", icon: Users, permission: "users.view" },
  { href: "/operations", label: "Operations", icon: ClipboardList, permission: "operations.view" },
  { href: "/accounting", label: "Accounting", icon: Calculator, permission: "accounting.view" },
  { href: "/administration", label: "Administration", icon: Wrench, permission: "administration.view" },
  { href: "/farmer-cow-management", label: "Farmer & Cow Management", icon: Users, permission: "farmer-cow.manage" },
  { href: "/audit", label: "Audit Logs", icon: Activity, permission: "audit.view" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.view" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [treatmentAlerts, setTreatmentAlerts] = useState<Array<{ tagNumber: string; ownerName: string; farmerId: string; diagnosis: string; withdrawalUntil: string }>>([]);

  if (!user) {
    return <>{children}</>;
  }
  if (user.mustChangePassword && pathname !== "/change-password") {
    router.replace("/change-password");
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Password change required...</div>;
  }

  const filteredItems = navItems.filter((item) => hasPermission(user.role, item.permission));
  const operationSections = [
    { id: "farmer-management", label: "Farmer Management", icon: Users },
    { id: "cow-management", label: "Cow Management", icon: ClipboardList },
    { id: "veterinary-treatment", label: "Cow Treatment", icon: ClipboardList },
    { id: "milk-collection", label: "Milk Collection", icon: Droplets },
    { id: "records", label: "Records", icon: FileText },
    { id: "batches", label: "Batches", icon: ClipboardList },
  ].filter(({ id }) => (id !== "milk-collection" || ["MILK_COLLECTOR", "MCC_OFFICER"].includes(user.role)) && (id !== "veterinary-treatment" || ["VETERINARY_OFFICER", "ADMIN", "SUPER_ADMIN", "MCC_MANAGER"].includes(user.role)) && (id !== "batches" || ["MILK_COLLECTOR", "MCC_OFFICER", "MCC_MANAGER", "ADMIN", "SUPER_ADMIN", "PROCESSING_INDUSTRY"].includes(user.role)));

  useEffect(() => {
    if (pathname !== "/operations") return;
    const updateSection = () => setActiveSection(window.location.hash.replace("#", "") || "farmer-management");
    updateSection();
    window.addEventListener("hashchange", updateSection);
    return () => window.removeEventListener("hashchange", updateSection);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    const canViewTreatmentAlerts = ["MCC_OFFICER", "VETERINARY_OFFICER", "MILK_COLLECTOR", "FARMER"].includes(user.role);
    if (!canViewTreatmentAlerts) {
      setTreatmentAlerts([]);
      return () => { active = false; };
    }
    const loadTreatmentAlerts = () => {
      void fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "phase2", userId: user.uid }),
      })
        .then((response) => response.json() as Promise<{ animals?: Animal[]; farmers?: Farmer[]; veterinaryRecords?: VeterinaryRecord[] }>)
        .then((data) => {
          if (!active) return;
          const today = new Date().toISOString().slice(0, 10);
          const animals = data.animals ?? [];
          const farmers = data.farmers ?? [];
          const alerts = (data.veterinaryRecords ?? [])
            .filter((record) => record.clearanceStatus !== "CLEARED" && (!record.withdrawalUntil || record.withdrawalUntil > today))
            .map((record) => {
              const cow = animals.find((animal) => animal.animalId === record.animalId);
              const owner = farmers.find((farmer) => farmer.farmerId === cow?.farmerId);
              return cow && owner ? { tagNumber: cow.tagNumber, ownerName: owner.fullName, farmerId: owner.farmerId, diagnosis: record.diagnosis, withdrawalUntil: record.withdrawalUntil || "Until cleared" } : null;
            })
            .filter((alert): alert is { tagNumber: string; ownerName: string; farmerId: string; diagnosis: string; withdrawalUntil: string } => Boolean(alert));
          setTreatmentAlerts(alerts);
        })
        .catch(() => {
          if (active) setTreatmentAlerts([]);
        });
    };
    loadTreatmentAlerts();
    const refreshAlerts = () => loadTreatmentAlerts();
    window.addEventListener("veterinary-record-updated", refreshAlerts);
    const interval = window.setInterval(loadTreatmentAlerts, 60000);
    return () => {
      active = false;
      window.removeEventListener("veterinary-record-updated", refreshAlerts);
      window.clearInterval(interval);
    };
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-[#f4f8f5] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full bg-gradient-to-b from-[#12382d] via-[#164b37] to-[#0d2b23] px-4 py-6 text-slate-100 shadow-2xl shadow-emerald-950/10 lg:w-72 lg:min-h-screen">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-500 text-emerald-950 shadow-lg shadow-emerald-950/20">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Milk</p>
              <h1 className="text-lg font-bold tracking-tight text-white">Digital Supply Chain</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {filteredItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-white text-[#12382d] shadow-lg shadow-emerald-950/10" : "text-emerald-50/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          {pathname === "/operations" && hasPermission(user.role, "operations.view") ? (
            <div className="mt-6 border-t border-slate-700 pt-5">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operations sections</p>
              <nav className="space-y-1.5" aria-label="Operations sections">
                {operationSections.map(({ id, label, icon: Icon }) => (
                  <a
                    key={id}
                    href={`/operations#${id}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      activeSection === id ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              Access
            </div>
            <p className="text-sm font-medium text-white">{user.role}</p>
            <p className="mt-1 text-xs text-slate-400">{user.email}</p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-30 border-b border-emerald-100/80 bg-[#f8fcf9]/90 px-5 py-4 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Operations overview</p>
                <h2 className="text-xl font-bold tracking-tight text-[#12382d]">Milk Collection Management</h2>
              </div>

              <div className="flex items-center gap-3">
                {["MCC_OFFICER", "VETERINARY_OFFICER", "MILK_COLLECTOR", "FARMER"].includes(user.role) ? <div className="relative">
                  <button type="button" onClick={() => setAlertsOpen((open) => !open)} className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${treatmentAlerts.length ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} aria-expanded={alertsOpen} aria-controls="treatment-alerts">
                    <Bell className="h-4 w-4" />
                    <span className={treatmentAlerts.length ? "font-bold text-rose-600" : ""}>{treatmentAlerts.length}</span> {treatmentAlerts.length === 1 ? "alert" : "alerts"}
                  </button>
                  {alertsOpen ? (
                    <div id="treatment-alerts" className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Cows under treatment</h3>
                        <button type="button" onClick={() => setAlertsOpen(false)} className="text-xs text-slate-500 hover:text-slate-900">Close</button>
                      </div>
                      {treatmentAlerts.length ? (
                        <ul className="mt-3 space-y-2">
                          {treatmentAlerts.map((alert, index) => (
                            <li key={`${alert.tagNumber}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                              <p className="font-semibold text-amber-900">{alert.tagNumber}</p>
                              <p className="mt-1 text-xs font-medium text-amber-800">Owner: {alert.ownerName}{["SUPER_ADMIN", "ADMIN"].includes(user.role) ? ` (${alert.farmerId})` : ""}</p>
                              <p className="mt-1 text-amber-800">{alert.diagnosis}</p>
                              <p className="mt-1 text-xs text-amber-700">Recovery/clearance: {alert.withdrawalUntil}</p>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">No cows are currently under treatment.</p>}
                    </div>
                  ) : null}
                </div> : null}
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <ArrowUpRight className="h-4 w-4" />
                  {user.fullName}
                </div>
                <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100">
                  <UserRound className="h-4 w-4" />
                  Profile
                </Link>
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

          <div className="p-5 md:p-8 lg:p-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading session...</div>;
  }
  if (!user) {
    return <RedirectToLogin />;
  }

  return <>{children}</>;
}

function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading session...</div>;
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
