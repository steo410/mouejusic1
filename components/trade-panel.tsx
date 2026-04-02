"use client";

import { useState } from "react";

export function TradePanel({ symbol }: { symbol: string }) {
  const [buyAmount, setBuyAmount] = useState("1000");
  const [sellQty, setSellQty] = useState("1");
  const [msg, setMsg] = useState("");

  async function buy() {
    const res = await fetch("/api/trade/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, amountKrw: Number(buyAmount) })
    });
    const data = await res.json();
    setMsg(data.message || (res.ok ? "매수 완료" : "매수 실패"));
  }

  async function sell() {
    const res = await fetch("/api/trade/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, quantity: Number(sellQty) })
    });
    const data = await res.json();
    setMsg(data.message || (res.ok ? "매도 완료" : "매도 실패"));
  }

  return (
    <section className="grid gap-3 rounded-lg border border-slate-800 p-4">
      <h2 className="font-semibold">거래</h2>
      <p className="text-xs text-slate-400">매수 최소 1,000원 / 수수료 0.1%</p>
      <div className="flex items-center gap-2">
        <input value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} className="rounded bg-slate-900 p-2" />
        <button className="rounded bg-emerald-600 px-3 py-2" onClick={buy}>매수</button>
      </div>
      <p className="text-xs text-slate-400">매도는 정수 수량만 가능</p>
      <div className="flex items-center gap-2">
        <input value={sellQty} onChange={(e) => setSellQty(e.target.value)} className="rounded bg-slate-900 p-2" />
        <button className="rounded bg-rose-600 px-3 py-2" onClick={sell}>매도</button>
      </div>
      <p className="text-sm text-slate-300">{msg}</p>
    </section>
  );
}
