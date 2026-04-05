import { NextResponse } from "next/server";
import { getQuote } from "@/lib/finance";

export async function GET() {
  const symbol = "AAPL";
  try {
    const quote = await getQuote(symbol);
    return NextResponse.json({ success: true, quote });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) });
  }
}
