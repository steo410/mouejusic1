import { StockChart } from "@/components/stock-chart";
import { TradePanel } from "@/components/trade-panel";
import { getQuote } from "@/lib/finance";

export default async function StockDetailPage({ params }: { params: { symbol: string } }) {
  let currentPrice: number | null = null;
  try {
    const quote = await getQuote(params.symbol);
    const price = Number(quote.regularMarketPrice);
    if (Number.isFinite(price) && price > 0) currentPrice = price;
  } catch {
    currentPrice = null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{params.symbol}</h1>
      <p className="text-sm text-slate-300">
        현재가: {currentPrice ? `${Math.round(currentPrice).toLocaleString()}원` : "조회 실패"}
      </p>
      <StockChart symbol={params.symbol} />
      <TradePanel symbol={params.symbol} />
    </div>
  );
}
