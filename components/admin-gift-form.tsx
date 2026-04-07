"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminGiftForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("100000");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAction(type: "gift" | "withdraw") {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId, 
          amount: Number(amount),
          type 
        }),
        cache: "no-store"
      });
      const body = await res.json();
      setMessage(body.message ?? (res.ok ? "처리 완료" : "처리 실패"));
      if (res.ok) {
        router.refresh();
      }
    } catch {
      setMessage("요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input 
          className="w-32 rounded bg-slate-900 p-1 text-sm border border-slate-700 focus:border-amber-500 outline-none" 
          type="number"
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          placeholder="금액 입력"
        />
        <button 
          className="rounded bg-amber-600 px-3 py-1 text-sm font-medium hover:bg-amber-500 disabled:opacity-50 transition-colors" 
          onClick={() => handleAction("gift")}
          disabled={loading}
        >
          지급
        </button>
        <button 
          className="rounded bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-500 disabled:opacity-50 transition-colors" 
          onClick={() => handleAction("withdraw")}
          disabled={loading}
        >
          회수
        </button>
      </div>
      {message && (
        <span className={`text-xs ${message.includes("실패") || message.includes("오류") || message.includes("없습니다") ? "text-red-400" : "text-emerald-400"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
