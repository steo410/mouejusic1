import { PortfolioTable } from "@/components/portfolio-table";
import { TradesTable } from "@/components/trades-table";

export default function MyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">마이페이지</h1>
      <PortfolioTable />
      <TradesTable />
    </div>
  );
}
