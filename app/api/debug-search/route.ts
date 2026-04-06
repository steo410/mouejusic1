import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "삼성전자";
  const key = process.env.FINNHUB_API_KEY ?? "KEY_MISSING";

  // 네이버 검색 URL 두 가지 시도
  const naverUrl1 = `https://m.stock.naver.com/api/search/all?query=${encodeURIComponent(q)}&exchange=KOSPI,KOSDAQ`;
  const naverUrl2 = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock,index,marketindicator`;
  const finnhubUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}`;

  const [naver1Res, naver2Res, finnhubRes] = await Promise.allSettled([
    fetch(naverUrl1, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Referer": "https://m.stock.naver.com/",
      },
    }).then(async (r) => ({ status: r.status, body: await r.text() })),
    fetch(naverUrl2, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Referer": "https://finance.naver.com/",
      },
    }).then(async (r) => ({ status: r.status, body: await r.text() })),
    fetch(finnhubUrl, {
      headers: { "X-Finnhub-Token": key },
    }).then(async (r) => ({ status: r.status, body: await r.json() })),
  ]);

  return NextResponse.json({
    query: q,
    key_prefix: key.slice(0, 8),
    naver1: naverUrl1,
    naver1_result: naver1Res.status === "fulfilled" ? { status: naver1Res.value.status, body_preview: naver1Res.value.body.slice(0, 200) } : { error: String((naver1Res as PromiseRejectedResult).reason) },
    naver2: naverUrl2,
    naver2_result: naver2Res.status === "fulfilled" ? { status: naver2Res.value.status, body_preview: naver2Res.value.body.slice(0, 200) } : { error: String((naver2Res as PromiseRejectedResult).reason) },
    finnhub: finnhubRes.status === "fulfilled" ? { status: finnhubRes.value.status, body: finnhubRes.value.body } : { error: String((finnhubRes as PromiseRejectedResult).reason) },
  });
}
