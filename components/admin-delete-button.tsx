"use client";

import { useState } from "react";

export function AdminDeleteButton({ userId, username }: { userId: string; username: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleDelete() {
    if (!confirm(`"${username}" 회원을 탈퇴시키겠습니까?\n모든 거래내역과 보유 주식이 삭제됩니다.`)) return;
    setLoading(true);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const body = await res.json();
    if (res.ok) {
      setDone(true);
    } else {
      alert(body.message ?? "삭제 실패");
    }
    setLoading(false);
  }

  if (done) return <p className="text-xs text-slate-500">탈퇴 완료 (새로고침 시 목록에서 제거됩니다)</p>;

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded bg-slate-700 px-2 py-1 text-xs text-rose-400 hover:bg-rose-700 hover:text-white disabled:opacity-50"
    >
      {loading ? "처리 중..." : "회원 탈퇴"}
    </button>
  );
}
