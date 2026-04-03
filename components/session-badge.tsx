"use client";

import { useEffect, useState } from "react";

type Me = {
  user: null | { id: string; username: string; nickname: string };
  cashBalance?: number;
};

export function SessionBadge() {
  const [me, setMe] = useState<Me>({ user: null });

  async function load() {
    const res = await fetch("/api/me");
    setMe(await res.json());
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  useEffect(() => {
    load();
  }, []);

  if (!me.user) return <p className="text-xs text-slate-400">비로그인 상태</p>;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-300">
      <span>{me.user.nickname} / 현금 {Math.round(me.cashBalance ?? 0).toLocaleString()}원</span>
      <button className="rounded border border-slate-700 px-2 py-1" onClick={logout}>로그아웃</button>
    </div>
  );
}
