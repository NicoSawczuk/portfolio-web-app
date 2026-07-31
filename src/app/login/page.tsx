"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "register";

interface FormState {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  error?: string;
  message?: string;
}

async function readAuthResponse(response: Response): Promise<AuthResponse> {
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as AuthResponse;
  } catch {
    return {};
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
  });

  const pageTitle = useMemo(
    () => (mode === "login" ? "Ingresar" : "Registrarse"),
    [mode]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setRegisterSuccessMessage(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : {
              email: form.email,
              name: form.name,
              password: form.password,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readAuthResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "No se pudo completar la autenticación.");
      }

      if (mode === "register") {
        setRegisterSuccessMessage(
          data.message ||
            "Registro exitoso. Contactate con el administrador para activar la cuenta y luego iniciá sesión."
        );
        setMode("login");
        setForm((current) => ({ ...current, password: "" }));
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-10">
      <section className="mx-auto flex w-full max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-600">Acceso</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{pageTitle}</h1>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-950/70">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-slate-900 text-white dark:bg-sky-600"
                  : "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === "register"
                  ? "bg-slate-900 text-white dark:bg-sky-600"
                  : "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Registro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-900/60"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-900/60"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</span>
              <input
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-sky-900/60"
              />
            </label>

            {registerSuccessMessage ? (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-600/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                <p>{registerSuccessMessage}</p>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              {submitting ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear usuario"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
