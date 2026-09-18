"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5Z" />
    </svg>
  );
}

export default function ThemeToggle({ className = "header-button inline-flex items-center justify-center" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  // Evita mismatch de hidratacion: el icono solo se define en el cliente.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      className={className}
    >
      {mounted ? (
        isLight ? (
          <SunIcon />
        ) : (
          <MoonIcon />
        )
      ) : (
        <span aria-hidden="true" className="block h-5 w-5" />
      )}
    </button>
  );
}
