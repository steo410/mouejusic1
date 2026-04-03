"use client";

import { useEffect, useState } from "react";

type Row = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  evalAmount: number;
};

type Portfolio = {
  rows: Row[];
  cashBalance: number;
  totalAsset: number;
};

export function PortfolioTable() {
  const [data, setData] = useState<Portfolio>({ rows: [], cashBalance: 0, totalAsset: 0 });
  const [message, setMessage] = useState("로딩 중...");
  const [sellQty, setSellQty] = useState<Record<string, string>>({});

  async function loadPortfolio() {
    const res = await fetch("/api/portfolio", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.message ?? "조회 실패");
      return;
    }
    setData(body);
    setMessage("");
  }

  async function sell(symbol: string) {
    try {
      const quantity = Number(sellQty[symbol] ?? "1");
      const res = await fetch("/api/trade/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity }),
        cache: "no-store"
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.message ?? "매도 실패");
        return;
      }
      setMessage(body.message ?? "매도 완료");
      await loadPortfolio();
      window.dispatchEvent(new Event("portfolio:updated"));
    } catch {
      setMessage("매도 요청 중 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    let timer: NodeJS.Timeout;
    loadPortfolio();
    timer = setInterval(loadPortfolio, 10000);
    const onUpdated = () => {
      loadPortfolio();
    };
    window.addEventListener("portfolio:updated", onUpdated);
    return () => {
      clearInterval(timer);
      window.removeEventListener("portfolio:updated", onUpdated);
    };
  }, []);

  return (
    <div className="space-y-4">
      {message && <p>{message}</p>}
      <div className="rounded border border-slate-800 p-3 text-sm">
        <p>현금: {Math.round(data.cashBalance).toLocaleString()}원</p>
        <p>총자산: {Math.round(data.totalAsset).toLocaleString()}원</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400">
            <th>종목</th>
            <th>보유수량</th>
            <th>평균매수가</th>
            <th>현재가</th>
            <th>평가금액</th>
            <th>매도</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.symbol}>
              <td>{r.symbol}</td>
              <td>{r.quantity.toLocaleString()}</td>
              <td>{Math.round(r.avgPrice).toLocaleString()}</td>
              <td>{Math.round(r.currentPrice).toLocaleString()}</td>
              <td>{Math.round(r.evalAmount).toLocaleString()}</td>
              <td>
                <div className="flex items-center gap-2">
                  <input
                    value={sellQty[r.symbol] ?? "1"}
                    onChange={(e) => setSellQty((prev) => ({ ...prev, [r.symbol]: e.target.value }))}
                    className="w-20 rounded bg-slate-900 p-1"
                  />
                  <button className="rounded bg-rose-600 px-2 py-1" onClick={() => sell(r.symbol)}>매도</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
