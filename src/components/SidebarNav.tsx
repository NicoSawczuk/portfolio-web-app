"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/portfolios", label: "Portfolios", icon: "📊" },
  { href: "/assets", label: "Activos", icon: "🏷️" },
  { href: "/export", label: "Exportar", icon: "📤" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-18 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:ring-sky-700 lg:hidden"
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>

        <Link
          href="/"
          className="absolute left-1/2 inline-flex -translate-x-1/2 items-center justify-center rounded-xl px-2 py-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:static lg:translate-x-0"
        >
          <img
            src="/logos/isotipo.svg"
            alt="Portfolio Hub"
            className="h-9 w-9 object-contain sm:h-10 sm:w-10 lg:hidden"
          />
          <picture className="hidden lg:block">
            <source srcSet="/logos/logo-dark.svg" media="(prefers-color-scheme: dark)" />
            <img src="/logos/logo-light.svg" alt="Portfolio Hub" className="h-8 w-auto object-contain" />
          </picture>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-sky-600"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="hidden rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/60 dark:text-rose-300 dark:hover:bg-rose-950/40 lg:inline-flex"
        >
          Cerrar sesión
        </button>

        <div className="h-11 w-11 lg:hidden" aria-hidden="true" />
      </div>

      <div
        className={`overflow-hidden border-t border-slate-200/70 bg-white/95 transition-all duration-200 ease-out dark:border-slate-800 dark:bg-slate-900/95 lg:hidden ${
          isMobileMenuOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-1.5">
            {items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white dark:bg-sky-600"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center text-lg leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
