"use client";

import { useEffect, useState } from "react";

type Row = {
  id: number;
  symbol: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  fee: number;
  tradedAt: string;
};

export function TradesTable() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    async function load() {
      const res = await fetch("/api/trades", { cache: "no-store" });
      if (!res.ok) return;
      setRows(await res.json());
    }
    load();
    timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="rounded-lg border border-slate-800 p-4">
      <h2 className="mb-2 font-semibold">거래 내역</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400">
            <th>시간</th>
            <th>종목</th>
            <th>구분</th>
            <th>가격</th>
            <th>수량</th>
            <th>수수료</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.tradedAt).toLocaleString("ko-KR")}</td>
              <td>{r.symbol}</td>
              <td>{r.side}</td>
              <td>{Math.round(r.price).toLocaleString()}</td>
              <td>{r.quantity}</td>
              <td>{Math.round(r.fee).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
