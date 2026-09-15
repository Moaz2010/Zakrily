"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/endpoints";
import { saveToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === "register"
          ? await authApi.register({ name, email, password })
          : await authApi.login({ email, password });
      saveToken(result.token);
      router.push("/subjects/english");
    } catch {
      setError("Something went wrong. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 p-6">
        <h1 className="text-xl font-semibold">{mode === "register" ? "Create account" : "Log in"}</h1>

        {mode === "register" && (
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "register" ? "Sign up" : "Log in"}
        </button>

        <button
          type="button"
          className="w-full text-sm text-slate-500 underline"
          onClick={() => setMode(mode === "register" ? "login" : "register")}
        >
          {mode === "register" ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </form>
    </main>
  );
}
