"use client";

import { useEffect, useState } from "react";

type Leader = { nickname: string; totalAsset: number };

export function LeaderboardCard() {
  const [leader, setLeader] = useState<Leader | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then(setLeader)
      .catch(() => setLeader(null));
  }, []);

  return (
    <section className="rounded-lg border border-slate-800 p-4">
      <h2 className="font-semibold">현재 1위</h2>
      <p className="mt-2 text-sm text-slate-300">
        {leader ? `${leader.nickname} (${Math.round(leader.totalAsset).toLocaleString()}원)` : "불러오는 중..."}
      </p>
    </section>
  );
}
