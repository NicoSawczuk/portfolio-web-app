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
            "Registro exitoso. Si tu cuenta requiere activación, contactate con el administrador."
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
    <main className="page auth-page">
      <section className="auth-shell">
        <div className="card auth-card">
          <div className="auth-header">
            <p className="eyebrow">Acceso</p>
            <h1 className="auth-title">{pageTitle}</h1>
          </div>

          <div className="auth-mode-switch">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`auth-mode-button ${mode === "login" ? "auth-mode-button--active" : ""}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`auth-mode-button ${mode === "register" ? "auth-mode-button--active" : ""}`}
            >
              Registro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === "register" ? (
              <label className="auth-field">
                <span>Nombre</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="control auth-input"
                />
              </label>
            ) : null}

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="control auth-input"
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                minLength={8}
                required
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="control auth-input"
              />
            </label>

            {registerSuccessMessage ? (
              <div className="alert-success">
                <p>{registerSuccessMessage}</p>
              </div>
            ) : null}

            {error ? (
              <p className="alert-error">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="button button-primary auth-submit"
            >
              {submitting ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear usuario"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
