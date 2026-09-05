"use client";

import { useMemo, useState } from "react";
import { AppShell, AccessDenied, AuthGuard } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { appendAuditEntry, type MccCenter, readAppState, writeAppState } from "@/lib/app-data";
import { hasPermission } from "@/lib/auth/roles";

const emptyForm = {
  mccCode: "MCC-00",
  name: "",
  description: "",
  district: "",
  sector: "",
  cell: "",
  village: "",
  phone: "",
  email: "",
};

export default function MccPage() {
  const { user } = useAuth();
  const state = useMemo(() => readAppState(), []);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [managerId, setManagerId] = useState(state.mccs[0]?.managerUserId ?? "");

  if (!user || !hasPermission(user.role, "mcc.view")) {
    return (
      <AuthGuard>
        <AppShell>
          <AccessDenied />
        </AppShell>
      </AuthGuard>
    );
  }

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function createMcc(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextState = readAppState();
    const nextCode = form.mccCode.trim();

    if (!nextCode || !form.name) {
      setMessage("MCC code and name are required.");
      return;
    }

    const exists = nextState.mccs.some((mcc) => mcc.mccCode.toLowerCase() === nextCode.toLowerCase());
    if (exists) {
      setMessage("MCC code already exists.");
      return;
    }

    const newMcc: MccCenter = {
      mccId: `MCC-${String(nextState.mccs.length + 1).padStart(3, "0")}`,
      mccCode: nextCode,
      name: form.name,
      description: form.description || "New collection center",
      district: form.district,
      sector: form.sector,
      cell: form.cell,
      village: form.village,
      phone: form.phone,
      email: form.email,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    const updatedState = {
      ...nextState,
      mccs: [newMcc, ...nextState.mccs],
    };

    writeAppState(updatedState);
    appendAuditEntry(
      {
        userId: user.uid,
        action: "MCC_CREATED",
        module: "mcc",
        entityType: "mccCenter",
        entityId: newMcc.mccId,
        description: `${newMcc.name} was created by ${user.fullName}.`,
      },
      user.uid,
    );

    setForm(emptyForm);
    setMessage(`MCC ${newMcc.mccCode} successfully created.`);
  }

  function assignManager() {
    if (!managerId) {
      setMessage("Select a manager to assign.");
      return;
    }

    const nextState = readAppState();
    const selectedMcc = nextState.mccs[0];
    const updatedMccs = nextState.mccs.map((mcc) =>
      mcc.mccId === selectedMcc.mccId ? { ...mcc, managerUserId: managerId, updatedAt: new Date().toISOString() } : mcc,
    );

    writeAppState({ ...nextState, mccs: updatedMccs });
    appendAuditEntry(
      {
        userId: user.uid,
        action: "MCC_MANAGER_ASSIGNED",
        module: "mcc",
        entityType: "mccCenter",
        entityId: selectedMcc.mccId,
        description: `Manager ${managerId} assigned to ${selectedMcc.mccCode}.`,
      },
      user.uid,
    );

    setMessage("Assignment saved.");
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Management</p>
              <h1 className="text-3xl font-semibold text-slate-900">MCC management</h1>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{state.mccs.length} active centers</div>
          </div>

          {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <form onSubmit={createMcc} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Create MCC</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">MCC code</span>
                  <input
                    value={form.mccCode}
                    onChange={(event) => updateForm("mccCode", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  <span className="mb-2 block font-medium">Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">District</span>
                  <input value={form.district} onChange={(event) => updateForm("district", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Sector</span>
                  <input value={form.sector} onChange={(event) => updateForm("sector", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Cell</span>
                  <input value={form.cell} onChange={(event) => updateForm("cell", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Village</span>
                  <input value={form.village} onChange={(event) => updateForm("village", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Phone</span>
                  <input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Email</span>
                  <input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
              </div>

              <button type="submit" className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
                Save MCC
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Assign MCC Manager</h2>
              <div className="space-y-4">
                <select
                  value={managerId}
                  onChange={(event) => setManagerId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none focus:border-emerald-500"
                >
                  <option value="">Select manager</option>
                  {state.users.filter((entry) => entry.role === "MCC_MANAGER").map((entry) => (
                    <option key={entry.uid} value={entry.uid}>{entry.fullName}</option>
                  ))}
                </select>

                <button type="button" onClick={assignManager} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500">
                  Assign to MCC-001
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Registered MCCs</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">District</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {state.mccs.map((mcc) => (
                    <tr key={mcc.mccId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{mcc.mccCode}</td>
                      <td className="px-4 py-3">{mcc.name}</td>
                      <td className="px-4 py-3">{mcc.district}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{mcc.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
