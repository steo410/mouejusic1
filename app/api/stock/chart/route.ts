import { getChart } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  const range = (url.searchParams.get("range") || "1d") as "1d" | "5d" | "1mo";
  if (!symbol) return NextResponse.json({ message: "symbol required" }, { status: 400 });

  try {
    const chart = await getChart(symbol, range);
    const result = chart.quotes.map((q) => ({ ts: q.date.toISOString(), c: q.close ?? 0 }));
    return NextResponse.json({ points: result });
  } catch {
    return NextResponse.json({ message: "가격 데이터를 불러오지 못했습니다." }, { status: 502 });
  }
}
