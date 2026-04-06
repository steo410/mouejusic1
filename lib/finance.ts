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
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          ...(headers ?? {}),
        },
        next: { revalidate: 0 },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
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
    const data = await fetchWithRetry<{ closePrice?: string }>([
      "https://m.stock.naver.com/api/forex/FX_USDKRW",
    ], { "Referer": "https://m.stock.naver.com/" });
    const rate = Number(data.closePrice?.replace(/,/g, "") ?? 0);
    if (rate > 0) return rate;
  } catch {}
  return 1400;
}

// ── 한국 주식 현재가 ──────────────────────────────────────────
async function getKoreanQuote(symbol: string) {
  const code = toKrxCode(symbol);
  const data = await fetchWithRetry<{
    closePrice?: string;
    compareToPreviousClosePrice?: string;
    openPrice?: string;
    highPrice?: string;
    lowPrice?: string;
  }>([`https://m.stock.naver.com/api/stock/${code}/basic`], {
    "Referer": "https://m.stock.naver.com/",
  });
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

// ── 한국 주식 차트 ────────────────────────────────────────────
async function getKoreanChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const code = toKrxCode(symbol);

  // 네이버 금융 일봉/분봉 API
  const isIntraday = range === "1d";
  const count = range === "1d" ? 100 : range === "5d" ? 5 : 30;

  const urls = isIntraday
    ? [
        `https://api.stock.naver.com/chart/domestic/item/${code}/minute?count=${count}&interval=1`,
        `https://m.stock.naver.com/api/stock/${code}/price?timeframe=day&count=1`,
      ]
    : [
        `https://api.stock.naver.com/chart/domestic/item/${code}/day?count=${count}&interval=1`,
        `https://m.stock.naver.com/api/stock/${code}/price?timeframe=day&count=${count}`,
      ];

  for (const url of urls) {
    try {
      const data = await fetchWithRetry<unknown>([url], {
        "Referer": "https://finance.naver.com/",
        "Origin": "https://finance.naver.com",
      });

      if (Array.isArray(data) && data.length > 1) {
        const quotes = data.map((d: Record<string, unknown>) => {
          const dateStr = String(d.localDate ?? d.date ?? d.time ?? "");
          const timeStr = String(d.localTime ?? d.time ?? "0930");
          const ymd = dateStr.length === 8
            ? `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`
            : dateStr.slice(0, 10);
          const hhmm = timeStr.replace(/(\d{2})(\d{2}).*/, "$1:$2");
          const close = Number(String(d.closePrice ?? d.close ?? d.ncv ?? 0).replace(/,/g, ""));
          return { date: new Date(`${ymd}T${hhmm}:00+09:00`), close };
        }).filter((q) => !isNaN(q.date.getTime()) && q.close > 0);

        if (quotes.length > 1) return { quotes };
      }
    } catch {}
  }

  // fallback: 현재가 단일
  const quote = await getKoreanQuote(symbol);
  return { quotes: [{ date: new Date(), close: quote.regularMarketPrice }] };
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
    }>([`https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock,index,marketindicator`], {
      "Referer": "https://finance.naver.com/",
    });
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
      symbol: r.symbol, shortname: r.description, longname: r.description,
    }));
    const finnhubSymbols = new Set(finnhubItems.map((r) => r.symbol));
    return {
      quotes: [
        ...finnhubItems,
        ...naver.filter((r) => !finnhubSymbols.has(r.symbol))
          .map((r) => ({ symbol: r.symbol, shortname: r.name, longname: r.name })),
      ],
    };
  } catch {
    return { quotes: naver.map((r) => ({ symbol: r.symbol, shortname: r.name, longname: r.name })) };
  }
}

export async function getQuote(symbol: string) {
  if (isKoreanSymbol(symbol)) return getKoreanQuote(symbol);
  return getUsQuote(symbol);
}

export async function getChart(symbol: string, range: "1d" | "5d" | "1mo") {
  if (isKoreanSymbol(symbol)) return getKoreanChart(symbol, range);
  return getUsChart(symbol, range);
}
