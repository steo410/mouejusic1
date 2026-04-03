import { getAccount, listHoldings, listUsers } from "@/lib/demo-db";
import { getQuote } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function GET() {
  const users = listUsers().filter((u) => !u.isAdmin);
  if (users.length === 0) return NextResponse.json({ nickname: "-", totalAsset: 0 });

  const ranking = await Promise.all(
    users.map(async (u) => {
      const account = getAccount(u.id);
      const holdings = listHoldings(u.id);
      let stockValue = 0;
      for (const h of holdings) {
        try {
          const q = await getQuote(h.symbol);
          stockValue += Number(q.regularMarketPrice) * h.quantity;
        } catch {
          stockValue += 0;
        }
      }
      return {
        nickname: u.nickname,
        totalAsset: (account?.cashBalance ?? 0) + stockValue
      };
    })
  );

  ranking.sort((a, b) => b.totalAsset - a.totalAsset);
  return NextResponse.json(ranking[0]);
}
