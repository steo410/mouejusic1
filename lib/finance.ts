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
      // XML 응답이면 그대로 반환 (JSON.parse 시도하지 않음)
      if (text.trimStart().startsWith("<")) return text as unknown as T;
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

// ── 날짜 문자열 파싱 헬퍼 ─────────────────────────────────────
// localDate: "20250401", localTime: "093000" → Date 객체
function parseNaverDate(dateStr: string, timeStr = "150000"): Date {
  const d = String(dateStr).replace(/\D/g, ""); // 숫자만
  const t = String(timeStr).replace(/\D/g, "").padEnd(6, "0");
  if (d.length < 8) return new Date(NaN);
  const ymd = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  const hms = `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
  return new Date(`${ymd}T${hms}+09:00`);
}

// ── fchart XML 파싱 헬퍼 ──────────────────────────────────────
// 네이버 fchart XML 응답 형식:
//   일봉: <item data="20260401|open|high|low|close|volume" />
//   분봉: <item data="202604011030|open|high|low|close|volume" />
//   (open/high/low 는 null 일 수 있음)
function parseFchartXml(
  xmlStr: string,
  isMinute: boolean
): { date: Date; close: number }[] {
  const matches = [...xmlStr.matchAll(/item data="([^"]+)"/g)];
  const quotes = matches
    .map((m) => {
      const parts = m[1].split("|");
      // parts[0] = 날짜(8자리) 또는 날짜+시간(12자리)
      // parts[4] = close 가격
      const datePart = parts[0] ?? "";
      const closePart = parts[4] ?? "";
      if (!datePart || closePart === "null" || closePart === "") return null;
      const closeVal = Number(closePart);
      if (!closeVal || closeVal <= 0) return null;

      let date: Date;
      if (isMinute && datePart.length >= 12) {
        // 분봉: 202604011030 → 날짜 8자리 + 시간 4자리(HHMM)
        date = parseNaverDate(datePart.slice(0, 8), datePart.slice(8, 12) + "00");
      } else {
        // 일봉: 20260401
        date = parseNaverDate(datePart.slice(0, 8));
      }
      if (isNaN(date.getTime())) return null;
      return { date, close: closeVal };
    })
    .filter((q): q is { date: Date; close: number } => q !== null);

  // 오래된 순으로 정렬
  quotes.sort((a, b) => a.date.getTime() - b.date.getTime());
  return quotes;
}

// ── 한국 주식 차트 (네이버 fchart XML) ───────────────────────
async function getKoreanChart(symbol: string, range: "1d" | "5d" | "1mo") {
  const code = toKrxCode(symbol);
  const fchartHeaders = { "Referer": "https://finance.naver.com/" };

  // 분봉(1d ): count=80, 일봉(5d/1mo): count=7 or 33
  const isMinute = range === "1d";
  const countMap = { "1d": 80, "5d": 7, "1mo": 33 } as const;
  const count = countMap[range];
  const timeframe = isMinute ? "minute" : "day";

  const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=${timeframe}&count=${count}&requestType=0`;

  try {
    const raw = await fetchWithRetry<unknown>([url], fchartHeaders );
    const xmlStr = String(raw);

    const quotes = parseFchartXml(xmlStr, isMinute);
    if (quotes.length >= 2) return { quotes };
  } catch {
    // fall through to fallback
  }

  // ── 최후 fallback: 현재가 2포인트 ───────────────────────────
  try {
    const quote = await getKoreanQuote(symbol);
    const now = new Date();
    const prev = new Date(now.getTime() - 60_000);
    return {
      quotes: [
        { date: prev, close: quote.regularMarketPreviousClose || quote.regularMarketPrice },
        { date: now, close: quote.regularMarketPrice },
      ],
    };
  } catch {
    throw new Error(`차트 데이터를 불러올 수 없습니다: ${symbol}`);
  }
}

// ── 미국 주식 현재가 ──────────────────────────────────────────
async function getUsQuote(symbol: string) {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol )}?range=1d&interval=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol )}?range=1d&interval=1d`,
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
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol )}?range=${range}&interval=${interval}&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol )}?range=${range}&interval=${interval}&includePrePost=false`,
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
      [`https://ac.stock.naver.com/ac?q=${encodeURIComponent(query )}&target=stock,index,marketindicator`],
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
    }>([`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query )}&token=${FINNHUB_KEY}`]);

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
