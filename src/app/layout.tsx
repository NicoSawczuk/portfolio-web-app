import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolios de inversión",
  description: "Dashboard para gestionar portfolios y transacciones de inversión",
  icons: {
    icon: [
      { url: "/logos/favicon.ico" },
      { url: "/logos/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/logos/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/logos/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: [{ url: "/logos/favicon.ico" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#070d1c] text-slate-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
