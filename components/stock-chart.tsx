"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const RANGE_CONFIG = {
  "1d":  { interval: "5m",  range: "1d" },
  "5d":  { interval: "1d",  range: "5d" },
  "1mo": { interval: "1d",  range: "1mo" },
} as const;

async function fetchYahooChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const { interval, range: r } = RANGE_CONFIG[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${r}&interval=${interval}&includePrePost=false`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    const errMsg = data?.chart?.error?.description ?? "no result";
    throw new Error(errMsg);
  }
  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const points = timestamps
    .map((ts, i) => ({ ts: new Date(ts * 1000).toISOString(), c: closes[i] ?? 0 }))
    .filter((p) => p.c > 0);
  return { points, raw: { timestampCount: timestamps.length, closeCount: closes.length, pointCount: points.length } };
}

async function fetchNaverChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const res = await fetch(`/api/stock/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "네이버 차트 오류");
  return { points: (data.points ?? []) as { ts: string; c: number }[], raw: { count: data.count } };
}

function isKorean(symbol: string) {
  return symbol.endsWith(".KS") || symbol.endsWith(".KQ");
}

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<"1d" | "5d" | "1mo">("1d");
  const [points, setPoints] = useState<{ ts: string; c: number }[]>([]);
  const [debug, setDebug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setDebug("");
      try {
        const result = isKorean(symbol)
          ? await fetchNaverChart(symbol, range)
          : await fetchYahooChart(symbol, range);
        if (!cancelled) {
          setPoints(result.points);
          setDebug(JSON.stringify(result.raw));
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [symbol, range]);

  const labels = points.map((p) => {
    const d = new Date(p.ts);
    return range === "1d"
      ? d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  });

  const first = points[0]?.c ?? 0;
  const last = points[points.length - 1]?.c ?? 0;
  const isUp = last >= first;
  const color = isUp ? "#34d399" : "#f87171";

  const chartData = {
    labels,
    datasets: [{
      label: symbol,
      data: points.map((p) => p.c),
      borderColor: color,
      backgroundColor: color + "22",
      borderWidth: 2,
      pointRadius: points.length > 30 ? 0 : 2,
      fill: true,
      tension: 0.3,
    }],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { mode: "index" as const, intersect: false } },
    scales: {
      x: { ticks: { maxTicksLimit: 6, color: "#94a3b8" }, grid: { color: "#1e293b" } },
      y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
    },
  };

  return (
    <section className="rounded-lg border border-slate-800 p-4 space-y-3">
      <p className="text-sm text-slate-300">
        현재가:{" "}
        {last > 0
          ? isKorean(symbol)
            ? `${Math.round(last).toLocaleString()}원`
            : `$${last.toFixed(2)}`
          : "조회 중..."}
      </p>
      <div className="flex gap-2">
        {(["1d", "5d", "1mo"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded border px-2 py-1 text-sm ${
              range === r ? "border-emerald-500 text-emerald-400" : "border-slate-600 text-slate-400"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      {loading && <p className="text-sm text-slate-400">불러오는 중...</p>}
      {error && <p className="text-sm text-red-400">오류: {error}</p>}
      {debug && <p className="text-xs text-slate-500">debug: {debug}</p>}
      {!loading && !error && points.length > 1 && <Line data={chartData} options={options} />}
      {!loading && !error && points.length <= 1 && (
        <p className="text-sm text-slate-400">차트 데이터 부족 ({points.length}개)</p>
      )}
    </section>
  );
}
