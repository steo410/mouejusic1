import { requireUser } from "@/lib/auth";
import { getAccount, listHoldings } from "@/lib/demo-db";
import { getQuote } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const holdings = listHoldings(user.id);
  const rows = await Promise.all(
    holdings.map(async (h) => {
      try {
        const q = await getQuote(h.symbol);
        const currentPrice = Number(q.regularMarketPrice);
        return {
          symbol: h.symbol,
          quantity: h.quantity,
          avgPrice: h.avgBuyPrice,
          currentPrice,
          evalAmount: currentPrice * h.quantity
        };
      } catch {
        return {
          symbol: h.symbol,
          quantity: h.quantity,
          avgPrice: h.avgBuyPrice,
          currentPrice: 0,
          evalAmount: 0
        };
      }
    })
  );

  const account = getAccount(user.id);
  const totalStockValue = rows.reduce((sum, r) => sum + r.evalAmount, 0);
  return NextResponse.json(
    { rows, cashBalance: account?.cashBalance ?? 0, totalAsset: (account?.cashBalance ?? 0) + totalStockValue },
    { headers: { "Cache-Control": "no-store" } }
  );
}
