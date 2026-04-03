import "./globals.css";
import type { ReactNode } from "react";
import { SessionBadge } from "@/components/session-badge";
import { HeaderNavLinks } from "@/components/header-nav-links";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="border-b border-slate-800 p-4">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <HeaderNavLinks />
            <SessionBadge />
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
