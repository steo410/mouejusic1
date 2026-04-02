import { searchTicker } from "@/lib/finance";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const krxFallback = [
  { code: "005930", name: "삼성전자" },
  { code: "000660", name: "SK하이닉스" },
  { code: "035420", name: "NAVER" },
  { code: "005380", name: "현대차" }
];

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (!q) return NextResponse.json([]);

  let krxRows: Array<{ name: string; code: string }> = [];
  if (supabase) {
    const { data } = await supabase.from("krx_symbols").select("name, code").ilike("name", `%${q}%`).limit(10);
    krxRows = (data ?? []) as Array<{ name: string; code: string }>;
  } else {
    krxRows = krxFallback.filter((x) => x.name.includes(q) || x.code.includes(q));
  }

  const krx = krxRows.map((x) => ({ symbol: `${x.code}.KS`, name: x.name, source: "db" as const }));

  let usa: Array<{ symbol: string; name: string; source: "api" }> = [];
  try {
    const api = await searchTicker(q);
    usa = (api.quotes ?? []).slice(0, 10).map((x) => ({
      symbol: x.symbol ?? "",
      name: x.longname ?? x.shortname ?? x.symbol ?? "",
      source: "api" as const
    }));
  } catch {
    usa = [];
  }

  return NextResponse.json([...krx, ...usa].filter((x) => x.symbol));
}
