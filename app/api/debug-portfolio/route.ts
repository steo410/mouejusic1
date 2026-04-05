import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listHoldings, getAccount } from "@/lib/demo-db";
import { getQuote } from "@/lib/finance";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "로그인 안 됨" });

  const holdings = await listHoldings(user.id);
  
  const rows = await Promise.all(
    holdings.map(async (h) => {
      try {
        const q = await getQuote(h.symbol);
        return { symbol: h.symbol, quantity: h.quantity, avgBuyPrice: h.avgBuyPrice, currentPrice: q.regularMarketPrice, ok: true };
      } catch (e) {
        return { symbol: h.symbol, quantity: h.quantity, avgBuyPrice: h.avgBuyPrice, currentPrice: 0, ok: false, error: String(e) };
      }
    })
  );

  const account = await getAccount(user.id);
  return NextResponse.json({ user: user.username, holdings: rows, cash: account?.cashBalance });
}
