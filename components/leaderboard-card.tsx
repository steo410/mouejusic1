"use client";

import { useEffect, useState } from "react";

type RankEntry = {
  nickname: string;
  cashBalance: number;
  stockValue: number;
  totalAsset: number;
};

export function LeaderboardCard() {
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setRanking(data.ranking ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const leader = ranking[0] ?? null;

  return (
    <section className="rounded-lg border border-slate-800 p-4 space-y-2">
      <h2 className="font-semibold">🏆 현재 1위</h2>
      {loading && <p className="text-sm text-slate-400">불러오는 중...</p>}
      {!loading && !leader && <p className="text-sm text-slate-400">아직 참가자가 없습니다.</p>}
      {!loading && leader && (
        <div className="space-y-1">
          <p className="text-base font-bold text-emerald-400">{leader.nickname}</p>
          <p className="text-sm text-slate-300">
            총 자산: <span className="text-white font-semibold">{leader.totalAsset.toLocaleString()}원</span>
          </p>
          <p className="text-xs text-slate-400">
            현금: {leader.cashBalance.toLocaleString()}원 &nbsp;|&nbsp; 주식 평가금: {leader.stockValue.toLocaleString()}원
          </p>
        </div>
      )}
    </section>
  );
}
