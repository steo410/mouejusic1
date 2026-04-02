const timeoutMs = Number(process.env.YAHOO_FINANCE_TIMEOUT_MS ?? 4000);

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 }
    });
    if (!res.ok) throw new Error(`Yahoo API failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

type SearchResponse = {
  quotes?: Array<{ symbol?: string; shortname?: string; longname?: string }>;
};

export async function searchTicker(query: string) {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
  return fetchJson<SearchResponse>(url);
}

type QuoteResponse = {
  quoteResponse?: {
    result?: Array<{ symbol?: string; regularMarketPrice?: number }>;
  };
};

export async function getQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const data = await fetchJson<QuoteResponse>(url);
  const quote = data.quoteResponse?.result?.[0];
  if (!quote) throw new Error("quote not found");
  return quote;
}

type ChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

export async function getChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const interval = range === "1d" ? "5m" : range === "5d" ? "30m" : "1d";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const data = await fetchJson<ChartResponse>(url);
  const result = data.chart?.result?.[0];
  const ts = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  return {
    quotes: ts.map((t, i) => ({ date: new Date(t * 1000), close: closes[i] ?? 0 }))
  };
}
