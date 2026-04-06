const timeoutMs = Number(process.env.FINNHUB_TIMEOUT_MS ?? 6000);
const FINNHUB_KEY = process.env.FINNHUB_API_KEY ?? "";

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        ...(headers ?? {}),
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`API failed: ${res.status} ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
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
    const url = "https://m.stock.naver.com/api/forex/FX_USDKRW";
    const data = await fetchJson<{ closePrice?: string }>(url, {
      "Referer": "https://m.stock.naver.com/",
    });
    const rate = Number(data.closePrice?.replace(/,/g, "") ?? 0);
    if (rate > 0) return rate;
  } catch {}
  return 1400;
}

// ── 한국 주식 현재가 (네이버) ─────────────────────────────────
async function getKoreanQuote(symbol: string) {
  const code = toKrxCode(symbol);
  const url = `https://m.stock.naver.com/api/stock/${code}/basic`;
  const data = await fetchJson<{
    closePrice?: string;
    compareToPreviousClosePrice?: string;
    openPrice?: string;
    highPrice?: string;
    lowPrice?: string;
  }>(url, { "Referer": "https://m.stock.naver.com/" });

  const currentPrice = Number(data.closePrice?.replace(/,/g, "") ?? 0);
  if (!currentPrice) throw new Error(`No price for ${symbol}`);
  return {
    symbol,
    regularMarketPrice: currentPrice,
    regularMarketPreviousClose: Number(data.compareToPreviousClosePrice?.replace(/,/g, "") ?? 0),
    regularMarketOpen: Number(data.openPrice?.replace(/,/g, "") ?? 0),
    regularMarketDayHigh: Number(data.highPrice?.replace(/,/g, "") ?? 0),
    regularMarketDayLow: Number(data.lowPrice?.replace(/,/g, "") ?? 0),
    currency: "KRW" as const,
  };
}

// ── 한국 주식 차트 (네이버) ───────────────────────────────────
async function getKoreanChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const code = toKrxCode(symbol);

  // 1d → 분봉(1분), 5d → 일봉 5개, 1mo → 일봉 30개
  const typeMap = { "1d": "minute", "5d": "day", "1mo": "day" } as const;
  const countMap = { "1d": 80, "5d": 5, "1mo": 30 } as const;
  const intervalMap = { "1d": "1", "5d": "1", "1mo": "1" } as const;

  const timeframe = typeMap[range];
  const count = countMap[range];

  // 네이버 금융 차트 API (올바른 URL)
  const url = `https://api.stock.naver.com/chart/domestic/item/${code}/${timeframe}?startDateTime=&endDateTime=&count=${count}&interval=${intervalMap[range]}`;

  try {
    const data = await fetchJson<Array<{ localDate?: string; localTime?: string; closePrice?: string | number }>>(url, {
      "Referer": "https://finance.naver.com/",
      "Origin": "https://finance.naver.com",
    });

    if (Array.isArray(data) && data.length > 0) {
      return {
        quotes: data.map((d) => ({
          date: new Date(`${String(d.localDate ?? "").replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}T${String(d.localTime ?? "09:00").replace(/(\d{2})(\d{2})(\d{2})/, "$1:$2:$3")}`),
          close: Number(String(d.closePrice ?? "0").replace(/,/g, "")),
        })),
      };
    }
  } catch {}

  // fallback: 현재가 단일 포인트
  const quote = await getKoreanQuote(symbol);
  return { quotes: [{ date: new Date(), close: quote.regularMarketPrice }] };
}

// ── 네이버 종목 검색 ──────────────────────────────────────────
async function searchNaverTicker(query: string) {
  try {
    const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock,index,marketindicator`;
    const data = await fetchJson<{
      items?: Array<{
        code?: string;
        name?: string;
        typeCode?: string;
        reutersCode?: string;
        nationCode?: string;
      }>;
    }>(url, { "Referer": "https://finance.naver.com/" });

    return (data.items ?? []).slice(0, 10).map((s) => {
      let symbol = "";
      if (s.nationCode === "KOR") {
        const exchange = s.typeCode === "KOSDAQ" ? ".KQ" : ".KS";
        symbol = `${s.code}${exchange}`;
      } else {
        const raw = s.reutersCode ?? s.code ?? "";
        symbol = raw.replace(/\.(O|OQ|N|A)$/, "");
      }
      return { symbol, name: s.name ?? s.code ?? "" };
    }).filter((s) => s.symbol);
  } catch {
    return [];
  }
}

// ── searchTicker ──────────────────────────────────────────────
type FinnhubSearchResult = {
  result?: Array<{ symbol: string; description: string; type: string }>;
};

export async function searchTicker(query: string) {
  const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(query);

  if (isKorean) {
    const naver = await searchNaverTicker(query);
    return { quotes: naver.map((r) => ({ symbol: r.symbol, shortname: r.name, longname: r.name })) };
  }

  const [finnhubData, naverResults] = await Promise.allSettled([
    fetchJson<FinnhubSearchResult>(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`
    ),
    searchNaverTicker(query),
  ]);

  const finnhubItems =
    finnhubData.status === "fulfilled"
      ? (finnhubData.value.result ?? []).slice(0, 10).map((r) => ({
          symbol: r.symbol,
          shortname: r.description,
          longname: r.description,
        }))
      : [];

  const naverItems = naverResults.status === "fulfilled" ? naverResults.value : [];
  const finnhubSymbols = new Set(finnhubItems.map((r) => r.symbol));

  return {
    quotes: [
      ...finnhubItems,
      ...naverItems
        .filter((r) => !finnhubSymbols.has(r.symbol))
        .map((r) => ({ symbol: r.symbol, shortname: r.name, longname: r.name })),
    ],
  };
}

// ── getQuote ──────────────────────────────────────────────────
type FinnhubQuote = { c: number; h: number; l: number; o: number; pc: number; t: number };

export async function getQuote(symbol: string) {
  if (isKoreanSymbol(symbol)) return getKoreanQuote(symbol);

  // Finnhub — 토큰을 쿼리 파라미터로 전달 (헤더 방식 403 우회)
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
  const data = await fetchJson<FinnhubQuote>(url);
  if (!data.c || data.c === 0) throw new Error(`No price data for ${symbol}`);
  return {
    symbol,
    regularMarketPrice: data.c,
    regularMarketPreviousClose: data.pc,
    regularMarketOpen: data.o,
    regularMarketDayHigh: data.h,
    regularMarketDayLow: data.l,
    currency: "USD" as const,
  };
}

// ── getChart ──────────────────────────────────────────────────
type FinnhubCandles = { c: number[]; t: number[]; s: string };

export async function getChart(symbol: string, range: "1d" | "5d" | "1mo") {
  if (isKoreanSymbol(symbol)) return getKoreanChart(symbol, range);

  const now = Math.floor(Date.now() / 1000);
  const resolution = range === "1d" ? "5" : "D";
  const from =
    range === "1d" ? now - 60 * 60 * 24
    : range === "5d" ? now - 60 * 60 * 24 * 5
    : now - 60 * 60 * 24 * 30;

  // 토큰을 쿼리 파라미터로 전달
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${now}&token=${FINNHUB_KEY}`;
  const data = await fetchJson<FinnhubCandles>(url);

  if (data.s !== "ok" || !data.t?.length) throw new Error(`No chart data for ${symbol}`);

  return {
    quotes: data.t.map((ts, i) => ({
      date: new Date(ts * 1000),
      close: data.c[i] ?? 0,
    })),
  };
}
