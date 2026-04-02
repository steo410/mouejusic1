import { LeaderboardCard } from "@/components/leaderboard-card";
import { MarketHours } from "@/components/market-hours";
import { StockSearch } from "@/components/stock-search";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">실전형 모의투자</h1>
      <LeaderboardCard />
      <MarketHours />
      <StockSearch />
    </div>
  );
}
