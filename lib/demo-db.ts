import { getAccount, listHoldings, listUsers } from "@/lib/demo-db";
import { getQuote } from "@/lib/finance";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allUsers = await listUsers();
    const users = allUsers.filter((u) => !u.isAdmin);

    if (users.length === 0) {
      return NextResponse.json({ ranking: [], debug: `total users: ${allUsers.length}` });
    }

    const ranking = await Promise.all(
      users.map(async (u) => {
        const account = await getAccount(u.id);
        const holdings = await listHoldings(u.id);
        let stockValue = 0;
        for (const h of holdings) {
          try {
            const q = await getQuote(h.symbol);
            stockValue += Number(q.regularMarketPrice) * h.quantity;
          } catch {
            stockValue += 0;
          }
        }
        const cashBalance = account?.cashBalance ?? 0;
        return {
          nickname: u.nickname,
          cashBalance: Math.round(cashBalance),
          stockValue: Math.round(stockValue),
          totalAsset: Math.round(cashBalance + stockValue),
        };
      })
    );

    ranking.sort((a, b) => b.totalAsset - a.totalAsset);
    return NextResponse.json({ ranking }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ranking: [], error: message }, { status: 500 });
  }
}
