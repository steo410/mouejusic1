"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TradePanel({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [buyQty, setBuyQty] = useState("1");
  const [msg, setMsg] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function buy() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/trade/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity: Number(buyQty) }),
        cache: "no-store"
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("매수가 완료되었습니다. 페이지를 새로고침합니다...");
        window.dispatchEvent(new Event("portfolio:updated"));
        setTimeout(() => { window.location.reload(); }, 1000);
      } else {
        setMsg(data.message || "매수 실패");
        setShowConfirm(false);
      }
    } catch { setMsg("매수 요청 중 오류가 발생했습니다."); setShowConfirm(false); } finally { setLoading(false); }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-slate-800 p-4">
      <h2 className="font-semibold">매수</h2>
      <p className="text-xs text-slate-400">매수는 주 단위(정수) / 수수료 0.1%</p>
      {!showConfirm ? (
        <div className="flex items-center gap-2">
          <input type="number" min="1" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} className="w-full rounded bg-slate-900 p-2 border border-slate-700 focus:border-emerald-500 outline-none" placeholder="수량" />
          <button className="whitespace-nowrap rounded bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 transition-colors" onClick={() => setShowConfirm(true)}>매수</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded bg-slate-900/50 p-3 border border-emerald-900/30">
          <p className="text-sm text-emerald-400 font-medium">{symbol} 종목을 {buyQty}주 매수하시겠습니까?</p>
          <div className="flex gap-2">
            <button className="flex-1 rounded bg-emerald-600 px-3 py-2 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50 transition-colors" onClick={buy} disabled={loading}>{loading ? "처리 중..." : "확인"}</button>
            <button className="flex-1 rounded bg-slate-700 px-3 py-2 text-sm font-bold hover:bg-slate-600 transition-colors" onClick={() => setShowConfirm(false)} disabled={loading}>취소</button>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-400">매도는 마이페이지에서 가능합니다.</p>
      {msg && <p className={`text-sm ${msg.includes("실패") || msg.includes("오류") ? "text-red-400" : "text-emerald-400"}`}>{msg}</p>}
    </section>
  );
}
