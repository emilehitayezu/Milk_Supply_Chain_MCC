"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Mail, ShieldCheck, Upload, UserRound } from "lucide-react";
import { AppShell, AuthGuard } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [preview, setPreview] = useState(user?.photoUrl ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("Profile pictures must be smaller than 1 MB.");
      return;
    }
    setError("");
    setMessage("");
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The selected image could not be read."));
        reader.onerror = () => reject(new Error("The selected image could not be read."));
        reader.readAsDataURL(file);
      });
      setPreview(dataUrl);
      setMessage("Picture ready. Save your profile to keep it.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Picture upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const result = await updateProfile({ fullName, email, ...(preview ? { photoUrl: preview } : {}) });
    if (result.ok) setMessage(result.message);
    else setError(result.message);
    setSaving(false);
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-7">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Account center</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#12382d]">Your profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Keep your identity and contact details up to date across the milk collection network.</p>
          </header>

          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#12382d] via-[#167245] to-[#25a866] p-7 text-white shadow-xl shadow-emerald-950/10 md:p-10">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-white/30 bg-white/15 text-4xl font-bold shadow-2xl">
                  {preview ? <img src={preview} alt={`${user?.fullName} profile`} className="h-full w-full object-cover" /> : user?.fullName.slice(0, 1).toUpperCase()}
                </div>
                <button type="button" onClick={() => fileInput.current?.click()} className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-lg hover:bg-emerald-50" aria-label="Upload profile picture">
                  <Camera className="h-5 w-5" />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-100">Signed-in account</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight">{user?.fullName}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-emerald-100"><Mail className="h-4 w-4" />{user?.email}</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
                  <ShieldCheck className="h-4 w-4" />{user?.role.replaceAll("_", " ")}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.65fr]">
            <form onSubmit={saveProfile} className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Personal details</p>
                <h2 className="mt-2 text-2xl font-bold text-[#12382d]">Profile information</h2>
              </div>
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Full name</span>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" required />
                </label>
              </div>
              {message ? <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</p> : null}
              {error ? <p className="mt-5 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
              <div className="mt-7 flex flex-wrap gap-3">
                <button type="submit" disabled={saving || uploading} className="rounded-2xl bg-[#12382d] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 hover:-translate-y-0.5 hover:bg-[#1a523e] disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save profile"}</button>
                <button type="button" onClick={() => router.push("/dashboard")} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Back to dashboard</button>
              </div>
            </form>

            <aside className="rounded-[2rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm md:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><UserRound className="h-6 w-6" /></div>
              <h2 className="mt-5 text-xl font-bold text-amber-950">Profile picture</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900/70">Add a clear picture so your colleagues can recognize you quickly at the MCC and in the collection workflow.</p>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} className="hidden" />
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60">
                <Upload className="h-4 w-4" />{uploading ? "Uploading..." : "Choose a picture"}
              </button>
              <p className="mt-3 text-center text-xs text-amber-900/60">PNG, JPG or WebP · maximum 1 MB</p>
            </aside>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
