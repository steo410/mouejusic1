import { StockChart } from "@/components/stock-chart";
import { TradePanel } from "@/components/trade-panel";

export default async function StockDetailPage({ params }: { params: { symbol: string } }) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{params.symbol}</h1>
      <StockChart symbol={params.symbol} />
      <TradePanel symbol={params.symbol} />
    </div>
  );
}
