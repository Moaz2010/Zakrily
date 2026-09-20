"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { authApi, progressApi, type LearnerStats, type UserOut } from "@/lib/api";
import { rewardsApi, type Rewards } from "@/lib/api";

type LearnerContext = {
  user: UserOut;
  stats: LearnerStats | null;
  rewards: Rewards | null;
  rewardsError: boolean;
  refreshRewards: () => Promise<void>;
  error: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
};
const Context = createContext<LearnerContext | null>(null);

export function LearnerProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [stats, setStats] = useState<LearnerStats | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [rewardsError, setRewardsError] = useState(false);
  const rewardRequest = useRef(0);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [error, setError] = useState(false);
  const request = useRef(0);
  const pathname = usePathname();

  const signOut = useCallback(() => {
    request.current++;
    rewardRequest.current++;
    localStorage.removeItem("zakrely_token");
    setUser(null);
    setStats(null);
    setRewards(null);
    setRewardsError(false);
    setError(false);
  }, []);

  const checkSession = useCallback(async () => {
    setChecking(true);
    setAuthError(false);
    if (localStorage.getItem("zakrely_token")) {
      try { setUser(await authApi.me()); }
      catch (err) { if ((err as { status?: number }).status !== 401) setAuthError(true); }
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    void checkSession();
    window.addEventListener("zakrely:unauthorized", signOut);
    return () => { window.removeEventListener("zakrely:unauthorized", signOut); request.current++; };
  }, [checkSession, signOut]);

  const refreshRewards = useCallback(async () => {
    if (!user) return;
    const id = ++rewardRequest.current;
    try {
      const data = await rewardsApi.get();
      if (id === rewardRequest.current) { setRewards(data); setRewardsError(false); }
    } catch {
      if (id === rewardRequest.current) setRewardsError(true);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    void refreshRewards();
    const id = ++request.current;
    setError(false);
    try {
      const data = await progressApi.stats();
      if (id === request.current) setStats(data);
    } catch {
      if (id === request.current) { setStats(null); setError(true); }
    }
  }, [user, refreshRewards]);

  useEffect(() => { void refresh(); }, [refresh, pathname]);
  useEffect(() => {
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  if (checking) return <p className="p-12 text-center" role="status">جاري تحميل حسابك…</p>;
  if (authError) return <div className="p-12 text-center" role="alert"><p>تعذر الاتصال بالخادم.</p><button onClick={() => void checkSession()} className="mt-4 underline">إعادة المحاولة</button></div>;
  if (!user) return <SignIn onSuccess={(account) => { setStats(null); setUser(account); }} />;
  return <Context.Provider value={{ user, stats, rewards, rewardsError, refreshRewards, error, refresh, signOut }}><div key={user.id}>{children}</div></Context.Provider>;
}

function SignIn({ onSuccess }: { onSuccess: (user: UserOut) => void }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = { email: String(form.get("email")), password: String(form.get("password")) };
    try {
      const result = register ? await authApi.register({ ...body, name: String(form.get("name")) }) : await authApi.login(body);
      localStorage.setItem("zakrely_token", result.token);
      onSuccess(result.user);
    } catch (err) {
      const { status, body } = err as { status?: number; body?: { detail?: unknown } };
      // 422 is a field-level validation error. Surfacing the reason matters most
      // on sign-up, where the generic message hid why the account was rejected.
      const detail = body?.detail;
      const validation = Array.isArray(detail)
        ? (detail[0] as { msg?: string } | undefined)?.msg
        : typeof detail === "string" ? detail : undefined;
      setMessage(
        status === 401 ? "البريد أو كلمة المرور غير صحيحة."
        : status === 400 ? "هذا البريد مستخدم بالفعل. جرّب تسجيل الدخول بدل إنشاء حساب."
        : status === 422 ? (validation?.includes("at least 8")
            ? "كلمة المرور لازم تكون ٨ أحرف على الأقل."
            : validation?.includes("email")
              ? "اكتب بريد إلكتروني صحيح."
              : "البيانات مش مظبوطة. راجع الحقول وجرّب تاني.")
        : register ? "تعذر إنشاء الحساب. تحقق من البيانات والاتصال بالخادم."
        : "تعذر تسجيل الدخول. تحقق من البيانات والاتصال بالخادم."
      );
    } finally { setBusy(false); }
  }
  return <div className="phone-shell min-h-screen px-6 py-16" dir="rtl">
    <h1 className="text-3xl font-bold mb-3">أهلاً بيك في ذاكريلي</h1>
    <p className="mb-8">{register ? "اعمل حساب جديد عشان نحفظ تقدمك ونتائجك." : "سجّل دخولك لحفظ تقدمك ونتائجك."}</p>
    <form onSubmit={submit} className="flex flex-col gap-4">
      {register && <label>الاسم<input name="name" required maxLength={120} autoComplete="name" className="block w-full rounded-xl border p-3 mt-1" /></label>}
      <label>البريد الإلكتروني<input name="email" type="email" required autoComplete="email" dir="ltr" className="block w-full rounded-xl border p-3 mt-1" /></label>
      <label>كلمة المرور<input name="password" type="password" required minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"} dir="ltr" className="block w-full rounded-xl border p-3 mt-1" />{register && <small>٨ أحرف على الأقل</small>}</label>
      {message && <p role="alert">{message}</p>}
      <button disabled={busy} className="rounded-xl bg-[#527f76] text-white p-3 disabled:opacity-50">{busy ? "جاري الإرسال…" : register ? "إنشاء حساب" : "تسجيل الدخول"}</button>
      <button type="button" disabled={busy} className="underline" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "عندي حساب بالفعل" : "إنشاء حساب جديد"}</button>
    </form>
  </div>;
}

export function useLearner() {
  const context = useContext(Context);
  if (!context) throw new Error("useLearner must be inside LearnerProvider");
  return context;
}

export function StatsStatus() {
  const { stats, error, refresh } = useLearner();
  if (error) return <div role="alert" className="p-4 text-center"><p>تعذر تحميل تقدمك.</p><button className="underline mt-2" onClick={() => void refresh()}>إعادة المحاولة</button></div>;
  if (!stats) return <p role="status" className="p-4 text-center">جاري تحميل تقدمك…</p>;
  return null;
}

export function percentage(value: number | null | undefined) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}
