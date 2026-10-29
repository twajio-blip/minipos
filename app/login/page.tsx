"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ReceiptText } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState("en");
  const [businessName, setBusinessName] = useState("Lite POS");
  const bangla = language === "bn";

  useEffect(() => {
    fetch("/api/pos?type=public-settings")
      .then((response) => response.json())
      .then((settings) => {
        setLanguage(settings.language || localStorage.getItem("lite-pos-language") || "en");
        setBusinessName(settings.business_name || "Lite POS");
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setError(result.message);
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center p-5 bg-[radial-gradient(circle_at_top_left,#dceddf,#f5f7f6_45%)]">
      <form onSubmit={submit} autoComplete="off" className="card w-full max-w-sm p-7">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#176b5b] text-white"><ReceiptText /></span>
          <div><h1 className="text-xl font-bold">{businessName}</h1><p className="text-sm text-slate-500">{bangla ? "চালিয়ে যেতে সাইন ইন করুন" : "Sign in to continue"}</p></div>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="label">{bangla ? "ইমেইল" : "Email"}</label>
        <input className="field mb-4" name="email" type="email" autoComplete="off" required />
        <label className="label">{bangla ? "পাসওয়ার্ড" : "Password"}</label>
        <input className="field mb-5" name="password" type="password" autoComplete="new-password" required />
        <button disabled={busy} className="btn btn-primary w-full">
          <LockKeyhole size={17} />
          {busy ? (bangla ? "সাইন ইন হচ্ছে…" : "Signing in…") : (bangla ? "সাইন ইন" : "Sign in")}
        </button>
      </form>
    </main>
  );
}
