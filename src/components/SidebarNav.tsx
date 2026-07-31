"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/", label: "Home", description: "Página principal", icon: "🏠" },
  { href: "/portfolios", label: "Portfolios", description: "Administrar carteras", icon: "📊" },
  { href: "/assets", label: "Activos", description: "Gestionar activos", icon: "🏷️" },
  { href: "/export", label: "Exportar", description: "Exportar transacciones", icon: "📤" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className={`${collapsed ? "lg:w-20" : "lg:w-72"} w-full border-b border-slate-200/70 bg-white/90 p-3 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/90 sm:p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="rounded-full border border-slate-200 p-1.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:p-2 sm:text-base"
          aria-label={collapsed ? "Expandir sidebar" : "Minimizar sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="mt-4 flex gap-1.5 lg:mt-6 lg:flex-1 lg:gap-2 lg:flex-col">
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl border px-2.5 py-2 text-left transition sm:rounded-2xl sm:px-4 sm:py-3 ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white dark:border-sky-600 dark:bg-sky-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              } ${collapsed ? "flex items-center justify-center px-3" : "flex items-start gap-3"}`}
            >
              <span className={`text-base sm:text-md ${collapsed ? "" : "mt-0.5"}`}>{item.icon}</span>
              {!collapsed ? (
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                </div>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className={`mt-3 inline-flex items-center justify-center rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/60 dark:text-rose-300 dark:hover:bg-rose-950/40 ${
          collapsed ? "lg:px-2" : ""
        }`}
      >
        {collapsed ? "Salir" : "Cerrar sesión"}
      </button>
    </aside>
  );
}
