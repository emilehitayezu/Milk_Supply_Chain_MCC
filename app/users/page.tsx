"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, AuthGuard } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { appendAuditEntry, DEFAULT_INITIAL_PASSWORD, type AppState, type AppUser, readAppState, writeAppState } from "@/lib/app-data";
import { hasPermission } from "@/lib/auth/roles";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  role: "MCC_MANAGER",
};

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (user && !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      const nextState = await readAppState();
      if (isMounted) {
        setState(nextState);
      }
    }

    void loadState();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentUser = user;
  const currentState = state as AppState | null;

  if (!currentUser || !["SUPER_ADMIN", "ADMIN"].includes(currentUser.role)) {
    return <AuthGuard><AppShell><div className="p-8 text-slate-500">Returning to dashboard...</div></AppShell></AuthGuard>;
  }

  if (!currentState) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Loading users…</div>
        </AppShell>
      </AuthGuard>
    );
  }

  const safeUser = currentUser as AppUser;
  const safeState = currentState as AppState;
  const canCreateUsers = hasPermission(safeUser.role, "users.create");
  const canManageUsers = ["ADMIN", "SUPER_ADMIN"].includes(safeUser.role);

  async function manageUser(action: "updateUser" | "deleteUser", data: Record<string, unknown>) {
    if (!window.confirm(action === "deleteUser" ? "Delete this user account? This cannot be undone." : "Save these user changes?")) return;
    const response = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, userId: safeUser.uid, data }) });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "User operation failed.");
      return;
    }
    setState(await readAppState());
    setEditingUser(null);
    setMessage(action === "deleteUser" ? "User deleted successfully." : "User updated successfully.");
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.fullName || !form.email) {
      setMessage("Full name and email are required.");
      return;
    }

    const exists = safeState.users.some((candidate) => candidate.email.toLowerCase() === form.email.toLowerCase());
    if (exists) {
      setMessage("A user with this email already exists.");
      return;
    }
    if (!window.confirm("Are you sure you want to save this user?")) return;

    const newUser: AppUser = {
      uid: `user-${Date.now()}`,
      fullName: form.fullName,
      email: form.email,
      password: DEFAULT_INITIAL_PASSWORD,
      mustChangePassword: true,
      role: form.role as AppUser["role"],
      mccIds: safeState.mccs.map((mcc) => mcc.mccId),
      status: "ACTIVE",
    };

    const nextState: AppState = { ...safeState, users: [newUser, ...safeState.users] };
    await writeAppState(nextState);
    await appendAuditEntry(
      {
        userId: safeUser.uid,
        action: "USER_CREATED",
        module: "users",
        entityType: "user",
        entityId: newUser.uid,
        description: `${newUser.fullName} was created as ${newUser.role}.`,
      },
      safeUser.uid,
    );

    setState(nextState);
    setForm(emptyForm);
    setMessage(`User successfully created: ${newUser.fullName}.`);
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Administration</p>
              <h1 className="text-3xl font-semibold text-slate-900">User management</h1>
            </div>
          </div>

          {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

          <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            {canCreateUsers ? <form onSubmit={handleCreateUser} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Create user</h2>
              <div className="space-y-4">
                <label className="block text-sm text-slate-700"><span className="mb-2 block font-medium">Full name</span><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
                <label className="block text-sm text-slate-700"><span className="mb-2 block font-medium">Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">New users receive the system default password and must change it at first login.</p>
                <label className="block text-sm text-slate-700"><span className="mb-2 block font-medium">Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"><option value="SUPER_ADMIN">SUPER_ADMIN</option><option value="ADMIN">ADMIN</option><option value="MCC_MANAGER">MCC_MANAGER</option><option value="MCC_OFFICER">MCC_OFFICER</option><option value="MILK_COLLECTOR">MILK_COLLECTOR</option><option value="VETERINARY_OFFICER">VETERINARY_OFFICER</option><option value="FINANCE_OFFICER">FINANCE_OFFICER</option></select></label>
                <button type="submit" className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">Save user</button>
              </div>
            </form> : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Registered users</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Status</th>{canManageUsers ? <th className="px-4 py-3 font-medium">Actions</th> : null}</tr></thead>
                  <tbody>
                    {safeState.users.map((entry) => (
                      <tr key={entry.uid} className="border-t border-slate-100">
                        <td className="px-4 py-3"><div className="font-medium text-slate-800">{entry.fullName}</div><div className="text-xs text-slate-500">{entry.email}</div></td>
                        <td className="px-4 py-3 text-slate-600">{entry.role}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{entry.status}</span></td>
                        {canManageUsers ? <td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => setEditingUser(entry)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">Edit / password</button>{entry.uid !== safeUser.uid ? <button type="button" onClick={() => void manageUser("deleteUser", { uid: entry.uid })} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white">Delete</button> : null}</div></td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editingUser ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
                <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                  <h2 className="text-xl font-semibold text-slate-900">Edit user account</h2>
                  <div className="mt-4 grid gap-3">
                    <input value={editingUser.fullName} onChange={(event) => setEditingUser({ ...editingUser, fullName: event.target.value })} placeholder="Full name" className="rounded-xl border px-3 py-2" />
                    <input type="email" value={editingUser.email} onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} placeholder="Email" className="rounded-xl border px-3 py-2" />
                    <input type="password" value={editingUser.password ?? ""} onChange={(event) => setEditingUser({ ...editingUser, password: event.target.value })} placeholder="New password (leave blank to keep current)" className="rounded-xl border px-3 py-2" />
                    <select value={editingUser.role} onChange={(event) => setEditingUser({ ...editingUser, role: event.target.value as AppUser["role"] })} className="rounded-xl border px-3 py-2"><option value="ADMIN">ADMIN</option><option value="MCC_MANAGER">MCC_MANAGER</option><option value="MCC_OFFICER">MCC_OFFICER</option><option value="MILK_COLLECTOR">MILK_COLLECTOR</option><option value="VETERINARY_OFFICER">VETERINARY_OFFICER</option><option value="FINANCE_OFFICER">FINANCE_OFFICER</option><option value="FARMER">FARMER</option></select>
                    <select value={editingUser.status} onChange={(event) => setEditingUser({ ...editingUser, status: event.target.value as AppUser["status"] })} className="rounded-xl border px-3 py-2"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
                  </div>
                  <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditingUser(null)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void manageUser("updateUser", editingUser)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Save changes</button></div>
                </div>
              </div> : null}
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
