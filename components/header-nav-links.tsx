"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Me = {
  user: null | { id: string; username: string; nickname: string; isAdmin?: boolean };
};

export function HeaderNavLinks() {
  const [me, setMe] = useState<Me>({ user: null });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/me", { cache: "no-store" });
      setMe(await res.json());
    }
    load();
  }, []);

  return (
    <div className="flex gap-4">
      <Link href="/">홈</Link>
      <Link href="/board">게시판</Link>
      {!me.user && <Link href="/auth">로그인/회원가입</Link>}
      {me.user && <Link href="/mypage">마이페이지</Link>}
      {me.user?.isAdmin && <Link href="/admin">관리자</Link>}
    </div>
  );
}
