"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 sm:h-[18px] sm:w-[18px]">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 sm:h-[18px] sm:w-[18px]">
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-7" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 sm:h-[18px] sm:w-[18px]">
      <path d="M20 10.5V4H13.5L4 13.5 10.5 20 20 10.5Z" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 sm:h-[18px] sm:w-[18px]">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 18v1.5A1.5 1.5 0 0 0 5.5 21h13A1.5 1.5 0 0 0 20 19.5V18" />
    </svg>
  );
}

const items = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/portfolios", label: "Portfolios", icon: BarChartIcon },
  { href: "/assets", label: "Activos", icon: TagIcon },
  { href: "/export", label: "Exportar", icon: UploadIcon },
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-700/70 bg-[#0b1220]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-[#111c30] text-slate-200 transition hover:bg-[#162238] focus:outline-none focus:ring-2 focus:ring-sky-500/60 lg:hidden"
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>

        <Link
          href="/"
          className="absolute left-1/2 inline-flex -translate-x-1/2 items-center justify-center rounded-xl px-2 py-1.5 transition hover:bg-slate-800/80 lg:static lg:translate-x-0"
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
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#3b82f6] text-white shadow-sm shadow-blue-500/10"
                    : "text-slate-300 hover:bg-[#111c30] hover:text-white"
                }`}
              >
                <span className="inline-flex items-center justify-center">
                  <Icon />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="hidden rounded-xl border border-slate-700 bg-[#111c30] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-[#162238] lg:inline-flex"
        >
          Cerrar sesión
        </button>

        <div className="h-11 w-11 lg:hidden" aria-hidden="true" />
      </div>

      <div
        className={`overflow-hidden border-t border-slate-700/70 bg-[#0b1220]/95 transition-all duration-200 ease-out lg:hidden ${
          isMobileMenuOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#3b82f6] text-white shadow-sm shadow-blue-500/10"
                      : "text-slate-300 hover:bg-[#111c30] hover:text-white"
                  }`}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center text-lg leading-none">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-[#111c30] px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-[#162238]"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
