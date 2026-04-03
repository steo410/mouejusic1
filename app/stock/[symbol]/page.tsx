"use client";

import { useState } from "react";

export function AdminGiftForm({ userId }: { userId: string }) {
  const [amount, setAmount] = useState("100000");
  const [message, setMessage] = useState("");

  async function gift() {
    try {
      const res = await fetch("/api/admin/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: Number(amount) }),
        cache: "no-store"
      });
      const body = await res.json();
      setMessage(body.message ?? (res.ok ? "선물 지급 완료" : "선물 지급 실패"));
      if (res.ok) window.location.reload();
    } catch {
      setMessage("선물 지급 요청 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input className="w-28 rounded bg-slate-900 p-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button className="rounded bg-amber-600 px-2 py-1" onClick={gift}>선물</button>
      <span className="text-xs text-slate-300">{message}</span>
    </div>
  );
}
