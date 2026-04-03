"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<"1d" | "5d" | "1mo">("1d");
  const [points, setPoints] = useState<{ ts: string; c: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    async function load() {
      try {
        setError(null);
        const res = await fetch(`/api/stock/chart?symbol=${symbol}&range=${range}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "차트 로딩 실패");
        setPoints(data.points);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    load();
    timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [symbol, range]);

  const data = {
    labels: points.map((p) => {
      const date = new Date(p.ts);
      return range === "1d"
        ? date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
    }),
    datasets: [{ label: symbol, data: points.map((p) => p.c), borderColor: "#818cf8" }]
  };

  return (
    <section className="rounded-lg border border-slate-800 p-4">
      <div className="mb-3 flex gap-2">
        {(["1d", "5d", "1mo"] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)} className="rounded border border-slate-600 px-2 py-1 text-sm">
            {r}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : <Line data={data} />}
    </section>
  );
}
