"use client";

import { useEffect, useState } from "react";
import { AppShell, AccessDenied, AuthGuard } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { appendAuditEntry, type AppState, type AppUser, type MccCenter, readAppState, writeAppState } from "@/lib/app-data";
import { hasPermission } from "@/lib/auth/roles";
import type { BreedType } from "@/lib/phase2-data";

type CollectorBatch = {
  batchId: string;
  collectorId?: string;
  collectorName: string;
  collectorBatchCode?: string;
  batchDate: string;
  totalLitres: number;
  status: string;
  approvalComment?: string;
  approvedAt?: string;
  farmerNames?: string[];
};

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
  const [collectorBatches, setCollectorBatches] = useState<CollectorBatch[]>([]);
  const [expandedCollectors, setExpandedCollectors] = useState<string[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [approvalComment, setApprovalComment] = useState("");
  const [batchAssignments, setBatchAssignments] = useState<Array<{ assignmentId: string; collectorId: string; collectorName?: string; batchCode: string; status: string }>>([]);
  const [assignmentCollectorId, setAssignmentCollectorId] = useState("");

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
      const batchResponse = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "collectorBatchApprovals", userId: user?.uid }) });
      const batchResult = await batchResponse.json() as { batches?: CollectorBatch[] };
      if (isMounted) setCollectorBatches(batchResult.batches ?? []);
      const assignmentResponse = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "collectorBatchAssignments", userId: user?.uid }) });
      const assignmentResult = await assignmentResponse.json() as { assignments?: typeof batchAssignments };
      if (isMounted) setBatchAssignments(assignmentResult.assignments ?? []);
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
    setMessage(`Milk collector account created successfully. Assigned batch: ${result.collectorBatchCode ?? "pending"}.`);
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

  async function decideSelectedBatches(status: "ACCEPTED" | "REJECTED") {
    if (!selectedBatchIds.length) {
      setMessage("Select at least one sub-batch.");
      return;
    }

    if (status === "REJECTED" && !approvalComment.trim()) {
      setMessage("A rejection comment is required.");
      return;
    }
    const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decideCollectorBatches", userId: safeUser.uid, data: { batchIds: selectedBatchIds, status, comment: approvalComment } }) });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Batch decision could not be saved.");
      return;
    }
    const refresh = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "collectorBatchApprovals", userId: safeUser.uid }) });
    const refreshed = await refresh.json() as { batches?: CollectorBatch[] };
    setCollectorBatches(refreshed.batches ?? []);
    setSelectedBatchIds([]);
    setApprovalComment("");
    setMessage(status === "ACCEPTED" ? "Selected sub-batches approved." : "Selected sub-batches rejected.");
  }

  async function assignBatch() {
    if (!assignmentCollectorId) {
      setMessage("Select a milk collector first.");
      return;
    }
    const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assignCollectorBatch", userId: safeUser.uid, data: { collectorId: assignmentCollectorId, mccId: safeState.mccs[0]?.mccId } }) });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Batch could not be assigned.");
      return;
    }
    setBatchAssignments((current) => [...current, result.assignment]);
    setAssignmentCollectorId("");
    setMessage(`Assigned ${result.assignment.batchCode} to the collector.`);
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

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-xl font-semibold text-slate-900">Milk collector batch approvals</h2><p className="mt-1 text-sm text-slate-500">Expand a collector to review and decide individual sub-batches.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void decideSelectedBatches("ACCEPTED")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Approve selected</button>
                    <button type="button" onClick={() => void decideSelectedBatches("REJECTED")} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white">Reject selected</button>
                  </div>
                </div>
                <textarea value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} placeholder="Comment for the selected sub-batches (required when rejecting)" className="mt-4 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3 font-medium">No.</th><th className="px-3 py-3 font-medium">Collector name</th><th className="px-3 py-3 font-medium">Batches</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Comments</th></tr></thead>
                    <tbody>
                      {[...new Map(collectorBatches.map((batch) => [batch.collectorId ?? batch.collectorName, batch])).values()].map((collector, index) => {
                        const collectorKey = collector.collectorId ?? collector.collectorName;
                        const batches = collectorBatches.filter((batch) => (batch.collectorId ?? batch.collectorName) === collectorKey);
                        const expanded = expandedCollectors.includes(collectorKey);
                        return <tr key={collectorKey} className="border-t border-slate-100 align-top"><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3 font-medium text-slate-800">{collector.collectorName}</td><td className="px-3 py-3"><button type="button" onClick={() => setExpandedCollectors((current) => expanded ? current.filter((key) => key !== collectorKey) : [...current, collectorKey])} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold">{expanded ? "Hide" : "Expand"} {collector.collectorBatchCode ?? "batches"} ({batches.length})</button>{expanded ? <div className="mt-3 min-w-[34rem] space-y-2">{batches.map((batch) => <label key={batch.batchId} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2"><input type="checkbox" disabled={batch.status !== "OPEN"} checked={selectedBatchIds.includes(batch.batchId)} onChange={(event) => setSelectedBatchIds((current) => event.target.checked ? [...current, batch.batchId] : current.filter((id) => id !== batch.batchId))} /><span className="flex-1"><strong>{batch.batchId}</strong><span className="ml-2 text-xs text-slate-500">{batch.batchDate} · {batch.totalLitres.toFixed(2)} L</span><span className="mt-1 block text-xs text-slate-600">Farmers: {batch.farmerNames?.join(", ") || "No farmers linked"}</span></span><span className="text-xs font-medium">{batch.status === "OPEN" ? "PENDING" : batch.status}</span></label>)}</div> : null}</td><td className="px-3 py-3">{batches.every((batch) => batch.status === "ACCEPTED") ? "Approved" : batches.every((batch) => batch.status === "REJECTED") ? "Rejected" : "Pending / mixed"}</td><td className="px-3 py-3">{batches.filter((batch) => batch.approvalComment).map((batch) => <div key={batch.batchId} className="mb-1 text-xs"><strong>{batch.batchId}:</strong> {batch.approvalComment}</div>)}</td></tr>;
                      })}
                      {!collectorBatches.length ? <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No collector sub-batches are available.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </section>

              {safeUser.role === "MCC_MANAGER" ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold text-slate-900">Assign collector batches</h2><p className="mt-1 text-sm text-slate-500">Each assigned parent batch uses the format BATCH-01-NAME_INITIALS.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><select value={assignmentCollectorId} onChange={(event) => setAssignmentCollectorId(event.target.value)} className="rounded-xl border px-3 py-2"><option value="">Select milk collector</option>{safeState.users.filter((entry) => entry.role === "MILK_COLLECTOR").map((entry) => <option key={entry.uid} value={entry.uid}>{entry.fullName}</option>)}</select><button type="button" onClick={() => void assignBatch()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Assign next batch</button></div><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-3">Collector</th><th className="px-3 py-3">Assigned batch</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{batchAssignments.map((assignment) => <tr key={assignment.assignmentId} className="border-t"><td className="px-3 py-3">{assignment.collectorName}</td><td className="px-3 py-3 font-medium">{assignment.batchCode}</td><td className="px-3 py-3">{assignment.status}</td></tr>)}</tbody></table></div></section> : null}
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
