"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 sm:h-[18px] sm:w-[18px]">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

const items = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/portfolios", label: "Portfolios", icon: BarChartIcon },
  { href: "/assets", label: "Activos", icon: TagIcon },
  { href: "/settings", label: "Configuración", icon: SettingsIcon },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = async () => {
    closeMobileMenu();
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="app-header sticky top-0 z-40 w-full backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          className="header-button inline-flex h-11 w-11 items-center justify-center rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/60 lg:hidden"
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
          onClick={closeMobileMenu}
          className="nav-link absolute left-1/2 inline-flex -translate-x-1/2 items-center justify-center rounded-xl px-2 py-1.5 lg:static lg:translate-x-0"
        >
          <img
            src="/logos/isotipo.svg"
            alt="Portfolio Hub"
            className="h-9 w-9 object-contain sm:h-10 sm:w-10 lg:hidden"
          />
          <span className="hidden lg:block">
            <img src="/logos/logo-dark.svg" alt="Portfolio Hub" className="theme-logo--dark h-8 w-auto object-contain" />
            <img src="/logos/logo-light.svg" alt="Portfolio Hub" className="theme-logo--light h-8 w-auto object-contain" />
          </span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                  isActive ? "nav-link--active shadow-sm shadow-blue-500/10" : ""
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

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle className="header-button inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl" />
          <button
            type="button"
            onClick={handleLogout}
            className="header-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium"
          >
            Cerrar sesión
          </button>
        </div>

        <ThemeToggle className="header-button inline-flex h-11 w-11 items-center justify-center rounded-xl lg:hidden" />
      </div>

      <div
        className={`mobile-menu overflow-hidden transition-all duration-200 ease-out lg:hidden ${
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
                  onClick={closeMobileMenu}
                  className={`nav-link inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive ? "nav-link--active shadow-sm shadow-blue-500/10" : ""
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
            className="header-button mt-3 inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-medium"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
