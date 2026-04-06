import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "삼성전자";

  // 네이버 검색 API 직접 테스트
  const naverUrl = `https://m.stock.naver.com/api/search/all?query=${encodeURIComponent(q)}&exchange=KOSPI,KOSDAQ`;
  const finnhubUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}`;
  const key = process.env.FINNHUB_API_KEY ?? "KEY_MISSING";

  const [naverRes, finnhubRes] = await Promise.allSettled([
    fetch(naverUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Referer": "https://m.stock.naver.com/",
      },
    }).then(async (r) => ({ status: r.status, body: await r.json() })),
    fetch(finnhubUrl, {
      headers: { "X-Finnhub-Token": key },
    }).then(async (r) => ({ status: r.status, body: await r.json() })),
  ]);

  return NextResponse.json({
    query: q,
    naver: naverRes.status === "fulfilled" ? naverRes.value : { error: String((naverRes as PromiseRejectedResult).reason) },
    finnhub: finnhubRes.status === "fulfilled" ? finnhubRes.value : { error: String((finnhubRes as PromiseRejectedResult).reason) },
  });
}
