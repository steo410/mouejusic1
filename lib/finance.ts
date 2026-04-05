const timeoutMs = Number(process.env.YAHOO_FINANCE_TIMEOUT_MS ?? 6000);

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
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
  // query1 실패 시 query2로 재시도
  const urls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
  ];

  let lastError: unknown;
  for (const url of urls) {
    try {
      const data = await fetchJson<QuoteResponse>(url);
      const quote = data.quoteResponse?.result?.[0];
      if (quote && quote.regularMarketPrice) return quote;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("quote not found");
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
  const interval = range === "1d" ? "5m" : "1d";
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
  ];

  let lastError: unknown;
  for (const url of urls) {
    try {
      const data = await fetchJson<ChartResponse>(url);
      const result = data.chart?.result?.[0];
      if (result) {
        const ts = result.timestamp ?? [];
        const closes = result.indicators?.quote?.[0]?.close ?? [];
        return {
          quotes: ts.map((t, i) => ({ date: new Date(t * 1000), close: closes[i] ?? 0 }))
        };
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("chart not found");
}
