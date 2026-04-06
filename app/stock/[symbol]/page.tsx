import { StockChart } from "@/components/stock-chart";
import { TradePanel } from "@/components/trade-panel";
import { getQuote, getUsdToKrw } from "@/lib/finance";

export default async function StockDetailPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol;
  const isKorean = symbol.endsWith(".KS") || symbol.endsWith(".KQ");

  let price: number | null = null;
  let usdToKrw: number | null = null;
  let krwPrice: number | null = null;

  try {
    const quote = await getQuote(symbol);
    price = quote.regularMarketPrice;
    if (!isKorean) {
      usdToKrw = await getUsdToKrw();
      krwPrice = Math.round(price * usdToKrw);
    }
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{symbol}</h1>
        {price !== null && (
          <div className="mt-1 space-y-0.5">
            {isKorean ? (
              <p className="text-2xl font-semibold">{Math.round(price).toLocaleString()}원</p>
            ) : (
              <>
                <p className="text-2xl font-semibold">${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                {krwPrice !== null && usdToKrw !== null && (
                  <p className="text-sm text-slate-400">
                    ≈ {krwPrice.toLocaleString()}원
                    <span className="ml-2 text-xs text-slate-500">(환율 {usdToKrw.toLocaleString()}원/달러)</span>
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <StockChart symbol={symbol} />
      <TradePanel symbol={symbol} />
    </div>
  );
}
