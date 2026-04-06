const timeoutMs = Number(process.env.FINNHUB_TIMEOUT_MS ?? 8000);

async function fetchWithRetry<T>(urls: string[], headers?: Record<string, string>): Promise<T> {
  let lastErr: unknown;
  for (const url of urls) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
          "Cache-Control": "no-cache",
          ...(headers ?? {}),
        },
        next: { revalidate: 0 },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      const text = await res.text();
      return JSON.parse(text) as T;
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(id);
    }
  }
  throw lastErr;
}

function isKoreanSymbol(symbol: string) {
  return symbol.endsWith(".KS") || symbol.endsWith(".KQ");
}

function toKrxCode(symbol: string) {
  return symbol.replace(/\.(KS|KQ)$/, "");
}

// ── USD→KRW 환율 ──────────────────────────────────────────────
export async function getUsdToKrw(): Promise<number> {
  try {
    const data = await fetchWithRetry<{ closePrice?: string }>(
      ["https://m.stock.naver.com/api/forex/FX_USDKRW"],
      { "Referer": "https://m.stock.naver.com/" }
    );
    const rate = Number(data.closePrice?.replace(/,/g, "") ?? 0);
    if (rate > 0) return rate;
  } catch {}
  return 1400;
}

// ── 한국 주식 현재가 (네이버) ─────────────────────────────────
async function getKoreanQuote(symbol: string) {
  const code = toKrxCode(symbol);
  const data = await fetchWithRetry<{
    closePrice?: string;
    compareToPreviousClosePrice?: string;
    openPrice?: string;
    highPrice?: string;
    lowPrice?: string;
  }>(
    [`https://m.stock.naver.com/api/stock/${code}/basic`],
    { "Referer": "https://m.stock.naver.com/" }
  );
  const price = Number(data.closePrice?.replace(/,/g, "") ?? 0);
  if (!price) throw new Error(`No price for ${symbol}`);
  return {
    symbol,
    regularMarketPrice: price,
    regularMarketPreviousClose: Number(data.compareToPreviousClosePrice?.replace(/,/g, "") ?? 0),
    regularMarketOpen: Number(data.openPrice?.replace(/,/g, "") ?? 0),
    regularMarketDayHigh: Number(data.highPrice?.replace(/,/g, "") ?? 0),
    regularMarketDayLow: Number(data.lowPrice?.replace(/,/g, "") ?? 0),
    currency: "KRW" as const,
  };
}

// ── 한국 주식 차트 (네이버 여러 엔드포인트 시도) ──────────────
async function getKoreanChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const code = toKrxCode(symbol);

  // 엔드포인트 목록 — 순서대로 시도
  const endpointSets: Array<{ urls: string[]; headers: Record<string, string> }> = [
    // 1) 네이버 증권 PC API (일봉/분봉)
    {
      urls: range === "1d"
        ? [`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=80&requestType=0`]
        : range === "5d"
        ? [`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=5&requestType=0`]
        : [`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=30&requestType=0`],
      headers: { "Referer": "https://finance.naver.com/" },
    },
    // 2) 네이버 모바일 API
    {
      urls: range === "1d"
        ? [`https://m.stock.naver.com/api/stock/${code}/candle/minute?count=80`]
        : range === "5d"
        ? [`https://m.stock.naver.com/api/stock/${code}/candle/day?count=5`]
        : [`https://m.stock.naver.com/api/stock/${code}/candle/day?count=30`],
      headers: {
        "Referer": "https://m.stock.naver.com/",
        "Origin": "https://m.stock.naver.com",
      },
    },
    // 3) 네이버 금융 신규 API
    {
      urls: range === "1d"
        ? [`https://api.stock.naver.com/chart/domestic/item/${code}/minute?count=80&interval=1`]
        : range === "5d"
        ? [`https://api.stock.naver.com/chart/domestic/item/${code}/day?count=5&interval=1`]
        : [`https://api.stock.naver.com/chart/domestic/item/${code}/day?count=30&interval=1`],
      headers: {
        "Referer": "https://finance.naver.com/",
        "Origin": "https://finance.naver.com",
      },
    },
  ];

  for (const { urls, headers } of endpointSets) {
    try {
      const data = await fetchWithRetry<unknown>(urls, headers);

      // 배열 형태 응답 처리
      if (Array.isArray(data) && data.length > 1) {
        const quotes = data.map((d: Record<string, unknown>) => {
          const dateStr = String(d.localDate ?? d.date ?? d.candleDate ?? "");
          const timeStr = String(d.localTime ?? d.time ?? d.candleTime ?? "0930");
          const ymd = dateStr.length === 8
            ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
            : dateStr.length >= 10 ? dateStr.slice(0, 10) : new Date().toISOString().slice(0, 10);
          const hhmm = timeStr.replace(/(\d{2})(\d{2}).*/, "$1:$2");
          const close = Number(String(
            d.closePrice ?? d.close ?? d.ncv ?? d.stck_prpr ?? 0
          ).replace(/,/g, ""));
          return { date: new Date(`${ymd}T${hhmm}:00+09:00`), close };
        }).filter((q) => !isNaN(q.date.getTime()) && q.close > 0);

        if (quotes.length > 1) return { quotes };
      }

      // XML 형태 응답 처리 (fchart.stock.naver.com)
      if (typeof data === "string" || (data as Record<string, unknown>)?.toString) {
        const str = String(data);
        const matches = [...str.matchAll(/item date="(\d+)" open="\d+" high="\d+" low="\d+" close="(\d+)"/g)];
        if (matches.length > 1) {
          const quotes = matches.map((m) => {
            const ds = m[1]; // "20240405" or "202404051030"
            const ymd = `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}`;
            const hhmm = ds.length > 8 ? `${ds.slice(8, 10)}:${ds.slice(10, 12)}` : "15:30";
            return { date: new Date(`${ymd}T${hhmm}:00+09:00`), close: Number(m[2]) };
          }).filter((q) => q.close > 0);
          if (quotes.length > 1) return { quotes };
        }
      }
    } catch {
      continue;
    }
  }

  // 최후 fallback: 현재가 1포인트
  try {
    const quote = await getKoreanQuote(symbol);
    return { quotes: [{ date: new Date(), close: quote.regularMarketPrice }] };
  } catch {
    throw new Error(`차트 데이터를 불러올 수 없습니다: ${symbol}`);
  }
}

// ── 미국 주식 현재가 ──────────────────────────────────────────
async function getUsQuote(symbol: string) {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
  ];
  const data = await fetchWithRetry<{
    chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
  }>(urls);
  const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!price) throw new Error(`No price for ${symbol}`);
  return {
    symbol,
    regularMarketPrice: price,
    regularMarketPreviousClose: 0,
    regularMarketOpen: 0,
    regularMarketDayHigh: 0,
    regularMarketDayLow: 0,
    currency: "USD" as const,
  };
}

// ── 미국 주식 차트 ────────────────────────────────────────────
async function getUsChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const intervalMap = { "1d": "5m", "5d": "1h", "1mo": "1d" } as const;
  const interval = intervalMap[range];

  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`,
  ];

  const data = await fetchWithRetry<{
    chart?: {
      result?: Array<{
        timestamp?: number[];
        meta?: { regularMarketPrice?: number };
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }>;
      error?: { description?: string };
    };
  }>(urls);

  const result = data.chart?.result?.[0];
  if (!result) throw new Error(data.chart?.error?.description ?? "no chart result");

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const quotes = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000), close: closes[i] ?? 0 }))
    .filter((q) => q.close > 0);

  if (quotes.length < 2) throw new Error("insufficient data");
  return { quotes };
}

// ── 종목 검색 ─────────────────────────────────────────────────
async function searchNaverTicker(query: string) {
  try {
    const data = await fetchWithRetry<{
      items?: Array<{
        code?: string;
        name?: string;
        typeCode?: string;
        reutersCode?: string;
        nationCode?: string;
      }>;
    }>(
      [`https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock,index,marketindicator`],
      { "Referer": "https://finance.naver.com/" }
    );
    return (data.items ?? []).slice(0, 10).map((s) => {
      const isKor = s.nationCode === "KOR";
      const exchange = s.typeCode === "KOSDAQ" ? ".KQ" : ".KS";
      const symbol = isKor
        ? `${s.code}${exchange}`
        : (s.reutersCode ?? s.code ?? "").replace(/\.(O|OQ|N|A)$/, "");
      return { symbol, name: s.name ?? s.code ?? "" };
    }).filter((s) => s.symbol);
  } catch {
    return [];
  }
}

export async function searchTicker(query: string) {
  const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(query);
  const naver = await searchNaverTicker(query);

  if (isKorean) {
    return { quotes: naver.map((r) => ({ symbol: r.symbol, shortname: r.name, longname: r.name })) };
  }

  try {
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY ?? "";
    const data = await fetchWithRetry<{
      result?: Array<{ symbol: string; description: string }>;
    }>([`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`]);

    const finnhubItems = (data.result ?? []).slice(0, 10).map((r) => ({
      symbol: r.symbol,
      shortname: r.description,
      longname: r.description,
    }));
    const finnhubSymbols = new Set(finnhubItems.map((r) => r.symbol));
    return {
      quotes: [
        ...finnhubItems,
        ...naver
          .filter((r) => !finnhubSymbols.has(r.symbol))
          .map((r) => ({ symbol: r.symbol, shortname: r.name, longname: r.name })),
      ],
    };
  } catch {
    return {
      quotes: naver.map((r) => ({ symbol: r.symbol, shortname: r.name, longname: r.name })),
    };
  }
}

// ── getQuote / getChart ───────────────────────────────────────
export async function getQuote(symbol: string) {
  if (isKoreanSymbol(symbol)) return getKoreanQuote(symbol);
  return getUsQuote(symbol);
}

export async function getChart(symbol: string, range: "1d" | "5d" | "1mo") {
  if (isKoreanSymbol(symbol)) return getKoreanChart(symbol, range);
  return getUsChart(symbol, range);
}
