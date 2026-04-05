import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.FINNHUB_API_KEY ?? "KEY_MISSING";
  const symbol = "AAPL";

  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}`;
  try {
    const res = await fetch(url, {
      headers: { "X-Finnhub-Token": key },
      next: { revalidate: 0 },
    });
    const data = await res.json();
    return NextResponse.json({ key_prefix: key.slice(0, 6), status: res.status, data });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
