"use client";

import { useEffect, useState } from "react";
import { AppShell, AccessDenied, AuthGuard } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { appendAuditEntry, type AppState, type AppUser, type MccCenter, readAppState, writeAppState } from "@/lib/app-data";
import { hasPermission } from "@/lib/auth/roles";
import type { BreedType } from "@/lib/phase2-data";

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
  const [state, setState] = useState<AppState | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [managerId, setManagerId] = useState("");
  const [collectorForm, setCollectorForm] = useState({ fullName: "", email: "", password: "" });
  const [editingMccId, setEditingMccId] = useState("");
  const [editingMcc, setEditingMcc] = useState({ name: "", district: "" });
  const [breedTypes, setBreedTypes] = useState<BreedType[]>([]);
  const [breedName, setBreedName] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      const nextState = await readAppState();
      if (isMounted) {
        setState(nextState);
        setManagerId(nextState.mccs[0]?.managerUserId ?? "");
      }
      const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "breedTypes", userId: user?.uid }) });
      const result = await response.json() as { breedTypes?: BreedType[] };
      if (isMounted) setBreedTypes(result.breedTypes ?? []);
    }

    void loadState();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentUser = user;
  const currentState = state as AppState | null;

  if (!currentUser || !hasPermission(currentUser.role, "mcc.view")) {
    return (
      <AuthGuard>
        <AppShell>
          <AccessDenied />
        </AppShell>
      </AuthGuard>
    );
  }

  if (!currentState) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Loading MCC data…</div>
        </AppShell>
      </AuthGuard>
    );
  }

  const safeUser = currentUser as AppUser;
  const safeState = currentState as AppState;

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createMcc(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextCode = form.mccCode.trim();

    if (!nextCode || !form.name) {
      setMessage("MCC code and name are required.");
      return;
    }

    const exists = safeState.mccs.some((mcc) => mcc.mccCode.toLowerCase() === nextCode.toLowerCase());
    if (exists) {
      setMessage("MCC code already exists.");
      return;
    }
    if (!window.confirm("Are you sure you want to save this MCC?")) return;

    const newMcc: MccCenter = {
      mccId: `MCC-${String(safeState.mccs.length + 1).padStart(3, "0")}`,
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

    const updatedState: AppState = { ...safeState, mccs: [newMcc, ...safeState.mccs] };
    await writeAppState(updatedState);
    await appendAuditEntry(
      {
        userId: safeUser.uid,
        action: "MCC_CREATED",
        module: "mcc",
        entityType: "mccCenter",
        entityId: newMcc.mccId,
        description: `${newMcc.name} was created by ${safeUser.fullName}.`,
      },
      safeUser.uid,
    );
    setState(updatedState);
    setForm(emptyForm);
    setMessage(`MCC ${newMcc.mccCode} successfully created.`);
  }

  async function assignManager() {
    if (!window.confirm("Are you sure you want to save this manager assignment?")) return;
    if (!managerId) {
      setMessage("Select a manager to assign.");
      return;
    }

    const selectedMcc = safeState.mccs[0];
    if (!selectedMcc) {
      setMessage("Create an MCC before assigning a manager.");
      return;
    }

    const updatedMccs = safeState.mccs.map((mcc) =>
      mcc.mccId === selectedMcc.mccId ? { ...mcc, managerUserId: managerId, updatedAt: new Date().toISOString() } : mcc,
    );

    const nextState: AppState = { ...safeState, mccs: updatedMccs };
    await writeAppState(nextState);
    await appendAuditEntry(
      {
        userId: safeUser.uid,
        action: "MCC_MANAGER_ASSIGNED",
        module: "mcc",
        entityType: "mccCenter",
        entityId: selectedMcc.mccId,
        description: `Manager ${managerId} assigned to ${selectedMcc.mccCode}.`,
      },
      safeUser.uid,
    );
    setState(nextState);
    setMessage("Assignment saved.");
  }

  function beginMccEdit(mcc: MccCenter) {
      setEditingMccId(mcc.mccId);
      setEditingMcc({ name: mcc.name, district: mcc.district });
      setMessage("");
  }

  async function saveMccEdit() {
      if (!editingMccId || !editingMcc.name.trim() || !editingMcc.district.trim()) {
        setMessage("MCC name and district are required.");
        return;
      }
      if (!window.confirm("Are you sure you want to update this MCC?")) return;
      const response = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateMcc",
          userId: safeUser.uid,
          data: { mccId: editingMccId, ...editingMcc },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "MCC could not be updated.");
        return;
      }
      setState(await readAppState());
      setEditingMccId("");
      setMessage("MCC details updated successfully.");
  }

  async function createCollector(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!collectorForm.fullName || !collectorForm.email) {
      setMessage("Collector name and email are required.");
      return;
    }

    if (!window.confirm("Are you sure you want to create this collector?")) return;
    const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "createCollector", userId: safeUser.uid, data: collectorForm }) });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Collector could not be created.");
      return;
    }
    setCollectorForm({ fullName: "", email: "", password: "" });
    setMessage("Milk collector account created successfully.");
    setState(await readAppState());
  }

  async function saveBreedType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "createBreedType", userId: safeUser.uid, data: { name: breedName } }) });
    const result = await response.json() as { error?: string; breedType?: BreedType };
    if (!response.ok) { setMessage(result.error ?? "Breed type could not be created."); return; }
    if (result.breedType) setBreedTypes((current) => [...current, result.breedType!].sort((a, b) => a.name.localeCompare(b.name)));
    setBreedName("");
    setMessage("Breed type created successfully.");
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
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{safeState.mccs.length} active centers</div>
          </div>

          {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            {safeUser.role === "MCC_MANAGER" ? (
              <form onSubmit={saveBreedType} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-emerald-950">Manage cow breed types</h2>
                <div className="flex gap-2"><input required placeholder="e.g. Friesian" value={breedName} onChange={(event) => setBreedName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2.5" /><button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white">Add breed</button></div>
                <div className="mt-3 flex flex-wrap gap-2">{breedTypes.map((breed) => <span key={breed.id} className="rounded-full bg-white px-3 py-1 text-sm text-emerald-800 ring-1 ring-emerald-200">{breed.name}</span>)}</div>
              </form>
            ) : null}
            {safeUser.role === "MCC_MANAGER" ? (
              <form onSubmit={createCollector} className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-sky-950">Create new milk collector</h2>
                <div className="space-y-4">
                  <input required placeholder="Full name" value={collectorForm.fullName} onChange={(event) => setCollectorForm({ ...collectorForm, fullName: event.target.value })} className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5" />
                  <input required type="email" placeholder="Email" value={collectorForm.email} onChange={(event) => setCollectorForm({ ...collectorForm, email: event.target.value })} className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5" />
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">The collector uses the system default password and must change it after first login.</p>
                  <button type="submit" className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-medium text-white">Create collector</button>
                </div>
              </form>
            ) : null}
            <form onSubmit={createMcc} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Create MCC</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">MCC code</span>
                  <input value={form.mccCode} onChange={(event) => updateForm("mccCode", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-2 block font-medium">Name</span>
                  <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  <span className="mb-2 block font-medium">Description</span>
                  <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
                </label>
                <label className="text-sm text-slate-700"><span className="mb-2 block font-medium">District</span><input value={form.district} onChange={(event) => updateForm("district", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
                <label className="text-sm text-slate-700"><span className="mb-2 block font-medium">Sector</span><input value={form.sector} onChange={(event) => updateForm("sector", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
                <label className="text-sm text-slate-700"><span className="mb-2 block font-medium">Cell</span><input value={form.cell} onChange={(event) => updateForm("cell", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
                <label className="text-sm text-slate-700"><span className="mb-2 block font-medium">Village</span><input value={form.village} onChange={(event) => updateForm("village", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
                <label className="text-sm text-slate-700"><span className="mb-2 block font-medium">Phone</span><input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
                <label className="text-sm text-slate-700"><span className="mb-2 block font-medium">Email</span><input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
              </div>
              <button type="submit" className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">Save MCC</button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Assign MCC Manager</h2>
              <div className="space-y-4">
                <select value={managerId} onChange={(event) => setManagerId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none focus:border-emerald-500">
                  <option value="">Select manager</option>
                  {safeState.users.filter((entry) => entry.role === "MCC_MANAGER").map((entry) => (
                    <option key={entry.uid} value={entry.uid}>{entry.fullName}</option>
                  ))}
                </select>
                <button type="button" onClick={assignManager} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500">Assign to MCC-001</button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Registered MCCs</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 font-medium">Code</th><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">District</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Action</th></tr></thead>
                <tbody>
                  {safeState.mccs.map((mcc) => (
                    <tr key={mcc.mccId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{mcc.mccCode}</td>
                      <td className="px-4 py-3">{editingMccId === mcc.mccId ? <input value={editingMcc.name} onChange={(event) => setEditingMcc({ ...editingMcc, name: event.target.value })} className="w-full rounded-lg border border-slate-200 px-2 py-1.5" /> : mcc.name}</td>
                      <td className="px-4 py-3">{editingMccId === mcc.mccId ? <input value={editingMcc.district} onChange={(event) => setEditingMcc({ ...editingMcc, district: event.target.value })} className="w-full rounded-lg border border-slate-200 px-2 py-1.5" /> : mcc.district}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{mcc.status}</span></td>
                      <td className="px-4 py-3">{hasPermission(safeUser.role, "mcc.edit") ? (editingMccId === mcc.mccId ? <div className="flex gap-2"><button type="button" onClick={() => void saveMccEdit()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button><button type="button" onClick={() => setEditingMccId("")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button></div> : <button type="button" onClick={() => beginMccEdit(mcc)} className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700">Edit</button>) : "—"}</td>
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
