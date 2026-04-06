import { NextResponse } from "next/server";
import { searchTicker } from "@/lib/finance";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "삼성전자";
  try {
    const result = await searchTicker(q);
    return NextResponse.json({ success: true, query: q, result });
  } catch (e) {
    return NextResponse.json({ success: false, query: q, error: String(e) });
  }
}
