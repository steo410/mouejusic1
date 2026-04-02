"use client";

import Link from "next/link";
import { useState } from "react";

type Result = { symbol: string; name: string; source: "db" | "api" };

export function StockSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSearch() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
      setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-800 p-4">
      <h2 className="mb-3 font-semibold">종목 검색</h2>
      <div className="flex gap-2">
        <input className="flex-1 rounded bg-slate-900 p-2" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="rounded bg-indigo-500 px-4 py-2" onClick={onSearch}>검색</button>
      </div>
      {loading && <p className="mt-2 text-sm">로딩 중...</p>}
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={`${item.source}-${item.symbol}`}>
            <Link className="text-indigo-300" href={`/stock/${encodeURIComponent(item.symbol)}`}>
              {item.name} ({item.symbol})
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
