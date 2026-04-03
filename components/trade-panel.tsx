"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TradePanel({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [buyQty, setBuyQty] = useState("1");
  const [msg, setMsg] = useState("");

  async function buy() {
    try {
      const res = await fetch("/api/trade/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity: Number(buyQty) }),
        cache: "no-store"
      });
      const data = await res.json();
      setMsg(data.message || (res.ok ? "매수 완료" : "매수 실패"));
      if (res.ok) {
        window.dispatchEvent(new Event("portfolio:updated"));
        router.refresh();
      }
    } catch {
      setMsg("매수 요청 중 오류가 발생했습니다.");
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-slate-800 p-4">
      <h2 className="font-semibold">매수</h2>
      <p className="text-xs text-slate-400">매수는 주 단위(정수) / 수수료 0.1%</p>
      <div className="flex items-center gap-2">
        <input value={buyQty} onChange={(e) => setBuyQty(e.target.value)} className="rounded bg-slate-900 p-2" />
        <button className="rounded bg-emerald-600 px-3 py-2" onClick={buy}>매수</button>
      </div>
      <p className="text-xs text-slate-400">매도는 마이페이지에서 가능합니다.</p>
      <p className="text-sm text-slate-300">{msg}</p>
    </section>
  );
}
