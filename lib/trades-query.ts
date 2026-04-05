import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function listTrades(userId: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("trades")
    .select("id,user_id,symbol,side,price,quantity,fee,traded_at")
    .eq("user_id", userId)
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    side: row.side,
    price: Number(row.price),
    quantity: row.quantity,
    fee: Number(row.fee),
    tradedAt: row.traded_at,
  }));
}
