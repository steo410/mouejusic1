import "./globals.css";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { SessionBadge } from "@/components/session-badge";
import Link from "next/link";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const me = await requireUser();

  return (
    <html lang="ko">
      <body>
        <header className="border-b border-slate-800 p-4">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="flex gap-4">
              <Link href="/">홈</Link>
              <Link href="/board">게시판</Link>
              {!me && <Link href="/auth">로그인/회원가입</Link>}
              {me && <Link href="/mypage">마이페이지</Link>}
              {me?.isAdmin && <Link href="/admin">관리자</Link>}
            </div>
            <SessionBadge />
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
