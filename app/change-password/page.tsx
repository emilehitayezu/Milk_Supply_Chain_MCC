"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) return setMessage("New password must be at least 8 characters.");
    if (newPassword !== confirmation) return setMessage("New passwords do not match.");
    const result = await changePassword(currentPassword, newPassword);
    setMessage(result.message);
    if (result.ok) router.replace("/dashboard");
  }

  if (!user) return null;
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold">Change your password</h1><p className="mt-2 text-sm text-slate-600">Use the default password <strong>MyPassword@2026</strong> in the first field, then choose your private password.</p><div className="mt-6 space-y-4"><input required type="password" placeholder="Default password: MyPassword@2026" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-xl border px-3 py-2.5" /><input required minLength={8} type="password" placeholder="New password (8+ characters)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border px-3 py-2.5" /><input required minLength={8} type="password" placeholder="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border px-3 py-2.5" /></div>{message ? <p className="mt-4 text-sm text-rose-600">{message}</p> : null}<button className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Save new password</button></form></main>;
}
