"use client";

import { Fragment, useEffect, useState } from "react";
import { AppShell, AccessDenied, AuthGuard } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { hasPermission } from "@/lib/auth/roles";
import type { AuditEntry } from "@/lib/app-data";
import type { CowRegistrationSession } from "@/lib/phase2-data";

export default function AuditPage() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditEntry[] | null>(null);
  const [sessions, setSessions] = useState<CowRegistrationSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState("ALL");
  const [auditModule, setAuditModule] = useState("ALL");
  const [auditSort, setAuditSort] = useState<"newest" | "oldest">("newest");
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      if (!user) return;
      const response = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "audit", userId: user?.uid }),
      });
      if (!response.ok) throw new Error("Audit logs are unavailable.");
      const payload = await response.json() as { auditLogs: AuditEntry[] };
      if (isMounted) setAuditLogs(payload.auditLogs);
      const sessionsResponse = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cowRegistrationSessions", userId: user.uid }) });
      if (sessionsResponse.ok) {
        const sessionPayload = await sessionsResponse.json() as { sessions: CowRegistrationSession[] };
        if (isMounted) setSessions(sessionPayload.sessions);
      }
    }

    void loadState();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  if (!user || !hasPermission(user.role, "audit.view")) {
    return (
      <AuthGuard>
        <AppShell>
          <AccessDenied />
        </AppShell>
      </AuthGuard>
    );
  }

  if (!auditLogs) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Loading audit logs…</div>
        </AppShell>
      </AuthGuard>
    );
  }

  const auditActions = [...new Set(auditLogs.map((entry) => entry.action))].sort();
  const auditModules = [...new Set(auditLogs.map((entry) => entry.module))].sort();
  const visibleAuditLogs = auditLogs
    .filter((entry) => auditAction === "ALL" || entry.action === auditAction)
    .filter((entry) => auditModule === "ALL" || entry.module === auditModule)
    .filter((entry) => {
      const query = auditSearch.trim().toLowerCase();
      return !query || [entry.action, entry.module, entry.entityType, entry.entityId, entry.description, entry.userId]
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return auditSort === "newest" ? -comparison : comparison;
    });

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Administration</p>
            <h1 className="text-3xl font-semibold text-slate-900">Audit logs</h1>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr,180px,180px,150px]">
              <input value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} placeholder="Search activity, user, entity, or description" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <select value={auditAction} onChange={(event) => setAuditAction(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="ALL">All actions</option>{auditActions.map((action) => <option key={action} value={action}>{action}</option>)}</select>
              <select value={auditModule} onChange={(event) => setAuditModule(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="ALL">All modules</option>{auditModules.map((module) => <option key={module} value={module}>{module}</option>)}</select>
              <select value={auditSort} onChange={(event) => setAuditSort(event.target.value as "newest" | "oldest")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
            </div>
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>Showing {visibleAuditLogs.length} of {auditLogs.length} activities</span><span>Click a row to view details</span></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Details</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAuditLogs.map((entry) => {
                    const expanded = expandedAudit === entry.auditId;
                    return <Fragment key={entry.auditId}>
                      <tr onClick={() => setExpandedAudit(expanded ? null : entry.auditId)} className="cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50">
                        <td className="px-4 py-3"><button type="button" className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold" aria-expanded={expanded}>{expanded ? "−" : "+"}</button></td>
                        <td className="px-4 py-3 font-medium text-slate-800">{entry.action}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.module}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.entityType}<br /><span className="text-xs">{entry.entityId}</span></td>
                        <td className="px-4 py-3 text-slate-600">{entry.userId}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(entry.timestamp).toLocaleString()}</td>
                      </tr>
                      {expanded ? <tr className="border-t border-slate-100 bg-emerald-50/50"><td colSpan={6} className="px-4 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activity description</p><p className="mt-1 text-sm text-slate-700">{entry.description}</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>Audit ID: {entry.auditId}</span><span>Entity ID: {entry.entityId}</span><span>Actor: {entry.userId}</span></div></td></tr> : null}
                    </Fragment>;
                  })}
                </tbody>
              </table>
              {!visibleAuditLogs.length ? <p className="p-6 text-center text-sm text-slate-500">No audit activities match your filters.</p> : null}
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-amber-950">User OTP activities</h2>
              <p className="mt-1 text-sm text-amber-800">Administrator-only activity history for every cow-registration OTP session.</p>
              <div className="mt-4 overflow-x-auto rounded-xl bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Details</th><th className="px-3 py-3">Purpose</th><th className="px-3 py-3">Farmer</th><th className="px-3 py-3">Requested by</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Created</th></tr></thead>
                  <tbody>
                    {sessions.map((session) => {
                      const expanded = expandedSession === session.authorizationSessionId;
                      return <Fragment key={session.authorizationSessionId}>
                        <tr className="border-t border-slate-100 align-top">
                          <td className="px-3 py-3"><button type="button" onClick={() => setExpandedSession(expanded ? null : session.authorizationSessionId)} className="mr-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold" aria-expanded={expanded}>{expanded ? "−" : "+"}</button><span className="font-medium">{session.batchId}</span></td>
                          <td className="px-3 py-3">Cow registration authorization<br /><span className="text-xs text-slate-500">{session.cowCount} cows · OTP approval</span></td>
                          <td className="px-3 py-3">{session.farmerName}<br /><span className="text-xs text-slate-500">{session.farmerPhone}</span></td>
                          <td className="px-3 py-3">{session.requestedByName}<br /><span className="text-xs text-slate-500">{session.requestedBy}</span></td>
                          <td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{session.status}</span></td>
                          <td className="px-3 py-3 text-xs text-slate-600">{new Date(session.createdAt).toLocaleString()}</td>
                        </tr>
                        {expanded ? <tr className="border-t border-amber-100 bg-amber-50/50"><td colSpan={6} className="px-4 py-4">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div><p className="text-xs uppercase tracking-wide text-slate-500">OTP given</p><p className="mt-1 font-mono text-2xl font-bold tracking-widest text-amber-900">{session.otpCode}</p><p className="mt-1 text-xs text-slate-600">Purpose: authorize all {session.cowCount} cow registrations in this batch.</p></div>
                            <div className="text-sm text-slate-700"><p><strong>Authorization session:</strong> {session.authorizationSessionId}</p><p><strong>Farmer:</strong> {session.farmerName} ({session.farmerId})</p><p><strong>Requested by:</strong> {session.requestedByName} ({session.requestedBy})</p></div>
                            <div className="text-sm text-slate-700"><p><strong>Expires:</strong> {new Date(session.expiresAt).toLocaleString()}</p><p><strong>Verified:</strong> {session.verifiedAt ? new Date(session.verifiedAt).toLocaleString() : "Not verified"}</p><p><strong>Used:</strong> {session.usedAt ? new Date(session.usedAt).toLocaleString() : "Not used"}</p><p><strong>Failed attempts:</strong> {session.failedAttempts}</p></div>
                          </div>
                          <div className="mt-4"><p className="text-xs uppercase tracking-wide text-slate-500">Cow tags in this batch</p><div className="mt-2 flex flex-wrap gap-2">{session.cowTags.map((tag) => <span key={tag} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200">{tag}</span>)}</div></div>
                        </td></tr> : null}
                      </Fragment>;
                    })}
                  </tbody>
                </table>
                {!sessions.length ? <p className="p-4 text-sm text-slate-500">No cow authorization sessions found.</p> : null}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
