import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getQuote } from "@/lib/finance";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const db = getSupabaseAdmin();

    const { data: allUsers, error: userError } = await db
      .from("users")
      .select("id, nickname, is_admin");

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const users = (allUsers ?? []).filter((u: any) => !u.is_admin);

    if (users.length === 0) {
      return NextResponse.json({ ranking: [] });
    }

    const ranking = await Promise.all(
      users.map(async (u: any) => {
        const { data: account } = await db
          .from("accounts")
          .select("cash_balance")
          .eq("user_id", u.id)
          .maybeSingle();

        const { data: holdings } = await db
          .from("holdings")
          .select("symbol, quantity")
          .eq("user_id", u.id);

        let stockValue = 0;
        for (const h of holdings ?? []) {
          try {
            const q = await getQuote(h.symbol);
            stockValue += Number(q.regularMarketPrice) * h.quantity;
          } catch {
            stockValue += 0;
          }
        }

        const cashBalance = Number(account?.cash_balance ?? 0);
        return {
          nickname: u.nickname,
          cashBalance: Math.round(cashBalance),
          stockValue: Math.round(stockValue),
          totalAsset: Math.round(cashBalance + stockValue),
        };
      })
    );

    ranking.sort((a, b) => b.totalAsset - a.totalAsset);
    return NextResponse.json(
      { ranking },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
