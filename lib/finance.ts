const timeoutMs = Number(process.env.FINNHUB_TIMEOUT_MS ?? 6000);
const FINNHUB_KEY = process.env.FINNHUB_API_KEY ?? "";

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "X-Finnhub-Token": FINNHUB_KEY },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Finnhub API failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

type FinnhubSearchResult = {
  result?: Array<{ symbol: string; description: string; type: string }>;
  count?: number;
};

export async function searchTicker(query: string) {
  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}`;
  const data = await fetchJson<FinnhubSearchResult>(url);
  return {
    quotes: (data.result ?? []).map((r) => ({
      symbol: r.symbol,
      shortname: r.description,
      longname: r.description,
    })),
  };
}

type FinnhubQuote = {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

export async function getQuote(symbol: string) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`;
  const data = await fetchJson<FinnhubQuote>(url);

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

type FinnhubCandles = {
  c: number[];
  t: number[];
  s: string;
};

export async function getChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const now = Math.floor(Date.now() / 1000);
  const resolution = range === "1d" ? "5" : "D";

  const from =
    range === "1d"
      ? now - 60 * 60 * 24
      : range === "5d"
      ? now - 60 * 60 * 24 * 5
      : now - 60 * 60 * 24 * 30;

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${now}`;
  const data = await fetchJson<FinnhubCandles>(url);

  if (data.s !== "ok" || !data.t?.length) {
    throw new Error(`No chart data for ${symbol}`);
  }

  return {
    quotes: data.t.map((ts, i) => ({
      date: new Date(ts * 1000),
      close: data.c[i] ?? 0,
    })),
  };
}
