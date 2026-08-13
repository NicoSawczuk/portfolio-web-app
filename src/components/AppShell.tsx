"use client";

import { usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <SidebarNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
