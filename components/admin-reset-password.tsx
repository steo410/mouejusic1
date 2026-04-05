"use client";

import { useState } from "react";

export function AdminResetPassword({ userId, username }: { userId: string; username: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleReset() {
    if (!newPassword || newPassword.length < 4) {
      setMessage("4자 이상 입력해주세요.");
      return;
    }
    if (!confirm(`"${username}" 회원의 비밀번호를 "${newPassword}"로 재설정하겠습니까?`)) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPassword }),
    });
    const body = await res.json();
    setMessage(body.message ?? (res.ok ? "완료" : "실패"));
    if (res.ok) setNewPassword("");
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        type="text"
        placeholder="새 비밀번호"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-32 rounded bg-slate-900 p-1 text-xs"
      />
      <button
        onClick={handleReset}
        disabled={loading}
        className="rounded bg-slate-700 px-2 py-1 text-xs text-blue-400 hover:bg-blue-700 hover:text-white disabled:opacity-50"
      >
        {loading ? "처리 중..." : "비밀번호 재설정"}
      </button>
      {message && <span className="text-xs text-slate-400">{message}</span>}
    </div>
  );
}
