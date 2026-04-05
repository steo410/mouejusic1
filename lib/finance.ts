const timeoutMs = Number(process.env.FINNHUB_TIMEOUT_MS ?? 6000);
const FINNHUB_KEY = process.env.FINNHUB_API_KEY ?? "";

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: headers ?? {},
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`API failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

// 한국 주식 여부 판별 (.KS, .KQ)
function isKoreanSymbol(symbol: string) {
  return symbol.endsWith(".KS") || symbol.endsWith(".KQ");
}

// 종목코드 추출: "005930.KS" → "005930"
function toKrxCode(symbol: string) {
  return symbol.replace(/\.(KS|KQ)$/, "");
}

// ── 한국 주식 현재가 (네이버 금융) ────────────────────────────
async function getKoreanQuote(symbol: string) {
  const code = toKrxCode(symbol);
  const url = `https://m.stock.naver.com/api/stock/${code}/basic`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Referer": "https://m.stock.naver.com/",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Naver API failed: ${res.status}`);
    const data = await res.json() as {
      closePrice?: string;
      compareToPreviousClosePrice?: string;
      openPrice?: string;
      highPrice?: string;
      lowPrice?: string;
    };
    const currentPrice = Number(data.closePrice?.replace(/,/g, "") ?? 0);
    if (!currentPrice) throw new Error(`No price for ${symbol}`);
    return {
      symbol,
      regularMarketPrice: currentPrice,
      regularMarketPreviousClose: Number(data.compareToPreviousClosePrice?.replace(/,/g, "") ?? 0),
      regularMarketOpen: Number(data.openPrice?.replace(/,/g, "") ?? 0),
      regularMarketDayHigh: Number(data.highPrice?.replace(/,/g, "") ?? 0),
      regularMarketDayLow: Number(data.lowPrice?.replace(/,/g, "") ?? 0),
    };
  } finally {
    clearTimeout(id);
  }
}

// ── 한국 주식 차트 (네이버 금융) ─────────────────────────────
async function getKoreanChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const code = toKrxCode(symbol);
  const timeframe = range === "1d" ? "day" : range === "5d" ? "day" : "month";
  const count = range === "1d" ? 1 : range === "5d" ? 5 : 30;
  const url = `https://m.stock.naver.com/api/stock/${code}/chart?chartType=area&timeframe=${timeframe}&count=${count}&requestType=0`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Referer": "https://m.stock.naver.com/",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Naver chart API failed: ${res.status}`);
    const data = await res.json() as Array<{ localDate: string; closePrice: string }>;
    return {
      quotes: data.map((d) => ({
        date: new Date(d.localDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")),
        close: Number(d.closePrice?.replace(/,/g, "") ?? 0),
      })),
    };
  } finally {
    clearTimeout(id);
  }
}

// ── searchTicker ──────────────────────────────────────────────
type FinnhubSearchResult = {
  result?: Array<{ symbol: string; description: string; type: string }>;
};

export async function searchTicker(query: string) {
  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}`;
  const data = await fetchJson<FinnhubSearchResult>(url, { "X-Finnhub-Token": FINNHUB_KEY });
  return {
    quotes: (data.result ?? []).map((r) => ({
      symbol: r.symbol,
      shortname: r.description,
      longname: r.description,
    })),
  };
}

// ── getQuote ──────────────────────────────────────────────────
type FinnhubQuote = {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

export async function getQuote(symbol: string) {
  // 한국 주식은 네이버 금융으로
  if (isKoreanSymbol(symbol)) return getKoreanQuote(symbol);

  // 미국 주식은 Finnhub
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`;
  const data = await fetchJson<FinnhubQuote>(url, { "X-Finnhub-Token": FINNHUB_KEY });
  if (!data.c || data.c === 0) throw new Error(`No price data for ${symbol}`);
  return {
    symbol,
    regularMarketPrice: data.c,
    regularMarketPreviousClose: data.pc,
    regularMarketOpen: data.o,
    regularMarketDayHigh: data.h,
    regularMarketDayLow: data.l,
  };
}

// ── getChart ──────────────────────────────────────────────────
type FinnhubCandles = {
  c: number[];
  t: number[];
  s: string;
};

export async function getChart(symbol: string, range: "1d" | "5d" | "1mo") {
  // 한국 주식은 네이버 금융으로
  if (isKoreanSymbol(symbol)) return getKoreanChart(symbol, range);

  // 미국 주식은 Finnhub
  const now = Math.floor(Date.now() / 1000);
  const resolution = range === "1d" ? "5" : "D";
  const from =
    range === "1d"
      ? now - 60 * 60 * 24
      : range === "5d"
      ? now - 60 * 60 * 24 * 5
      : now - 60 * 60 * 24 * 30;

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${now}`;
  const data = await fetchJson<FinnhubCandles>(url, { "X-Finnhub-Token": FINNHUB_KEY });

  if (data.s !== "ok" || !data.t?.length) throw new Error(`No chart data for ${symbol}`);

  return {
    quotes: data.t.map((ts, i) => ({
      date: new Date(ts * 1000),
      close: data.c[i] ?? 0,
    })),
  };
}
