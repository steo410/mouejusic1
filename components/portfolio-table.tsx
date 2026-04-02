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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    async function load() {
      const res = await fetch("/api/portfolio");
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.message ?? "조회 실패");
        return;
      }
      setData(body);
      setMessage("");
    }
    load();
    timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  if (message) return <p>{message}</p>;

  return (
    <div className="space-y-4">
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
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.symbol}>
              <td>{r.symbol}</td>
              <td>{r.quantity.toFixed(4)}</td>
              <td>{Math.round(r.avgPrice).toLocaleString()}</td>
              <td>{Math.round(r.currentPrice).toLocaleString()}</td>
              <td>{Math.round(r.evalAmount).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
