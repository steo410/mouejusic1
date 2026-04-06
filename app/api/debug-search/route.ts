import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "samsung";
  const key = process.env.FINNHUB_API_KEY ?? "KEY_MISSING";

  // 네이버 자동완성
  const naverUrl = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock,index,marketindicator`;
  // Finnhub 검색
  const finnhubUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}`;
  // AAPL 가격 직접 테스트
  const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=AAPL`;

  const [naverRes, finnhubRes, quoteRes] = await Promise.allSettled([
    fetch(naverUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Referer": "https://finance.naver.com/",
      },
    }).then(async (r) => ({ status: r.status, body: await r.json() })),
    fetch(finnhubUrl, {
      headers: { "X-Finnhub-Token": key },
    }).then(async (r) => ({ status: r.status, body: await r.json() })),
    fetch(quoteUrl, {
      headers: { "X-Finnhub-Token": key },
    }).then(async (r) => ({ status: r.status, body: await r.json() })),
  ]);

  return NextResponse.json({
    query: q,
    naver: naverRes.status === "fulfilled" ? naverRes.value : { error: String((naverRes as PromiseRejectedResult).reason) },
    finnhub_search: finnhubRes.status === "fulfilled" ? finnhubRes.value : { error: String((finnhubRes as PromiseRejectedResult).reason) },
    aapl_quote: quoteRes.status === "fulfilled" ? quoteRes.value : { error: String((quoteRes as PromiseRejectedResult).reason) },
  });
}
