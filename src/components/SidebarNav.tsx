"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Portfolios", description: "Administrar carteras", icon: "📊" },
  { href: "/assets", label: "Activos", description: "Gestionar activos", icon: "🏷️" },
  { href: "/export", label: "Exportar", description: "Exportar transacciones", icon: "📤" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? "lg:w-20" : "lg:w-72"} w-full border-b border-slate-200/70 bg-white/90 p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/90 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white dark:bg-sky-600">
            P
          </div>
          {!collapsed ? (
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Portfolio Hub</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Módulos de inversión</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={collapsed ? "Expandir sidebar" : "Minimizar sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="mt-6 flex gap-2 lg:flex-col">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white dark:border-sky-600 dark:bg-sky-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              } ${collapsed ? "flex items-center justify-center px-3" : "flex items-start gap-3"}`}
            >
              <span className={`text-lg ${collapsed ? "" : "mt-0.5"}`}>{item.icon}</span>
              {!collapsed ? (
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className={`mt-1 text-xs ${isActive ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>
                    {item.description}
                  </p>
                </div>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
